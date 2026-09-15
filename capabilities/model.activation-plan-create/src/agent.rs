#![no_std]
#![no_main]

const MAX_INPUT: usize = 4096;
const MAX_OUTPUT: usize = 1024;
#[repr(C)]
struct Iovec {
    buffer: *const u8,
    length: usize,
}
#[repr(C)]
struct IovecMut {
    buffer: *mut u8,
    length: usize,
}
#[link(wasm_import_module = "wasi_snapshot_preview1")]
unsafe extern "C" {
    fn fd_read(fd: u32, vectors: *const IovecMut, count: usize, read: *mut usize) -> u32;
    fn fd_write(fd: u32, vectors: *const Iovec, count: usize, written: *mut usize) -> u32;
}
static mut INPUT: [u8; MAX_INPUT + 1] = [0; MAX_INPUT + 1];
static mut OUTPUT: [u8; MAX_OUTPUT] = [0; MAX_OUTPUT];

#[unsafe(no_mangle)]
pub extern "C" fn _start() {
    unsafe {
        let mut total = 0usize;
        let input_ptr = core::ptr::addr_of_mut!(INPUT).cast::<u8>();
        while total < MAX_INPUT + 1 {
            let mut count = 0usize;
            let vector = IovecMut {
                buffer: input_ptr.add(total),
                length: MAX_INPUT + 1 - total,
            };
            if fd_read(0, &vector, 1, &mut count) != 0 || count == 0 {
                break;
            }
            total += count;
        }
        let input = core::slice::from_raw_parts(input_ptr, total);
        let output = core::slice::from_raw_parts_mut(
            core::ptr::addr_of_mut!(OUTPUT).cast::<u8>(),
            MAX_OUTPUT,
        );
        let length = evaluate(input, output);
        let mut written = 0usize;
        let vector = Iovec {
            buffer: core::ptr::addr_of!(OUTPUT).cast::<u8>(),
            length,
        };
        let _ = fd_write(1, &vector, 1, &mut written);
    }
}

fn evaluate(input: &[u8], output: &mut [u8]) -> usize {
    if input.len() > MAX_INPUT {
        return error(output, b"input_limit_exceeded");
    }
    let model_ref = string_after(input, b"\"model_ref\"");
    let target = string_after(input, b"\"target\"");
    let licence_ref = string_after(input, b"\"licence_ref\"");
    let digest = string_after(input, b"\"digest_evidence\"");
    let signature = string_after(input, b"\"signature_evidence\"");
    let licence = string_after(input, b"\"licence_evidence\"");
    let compatibility = string_after(input, b"\"runtime_compatibility\"");
    let Some(memory_required) = number_after(input, b"\"memory_required_bytes\"") else {
        return error(output, b"invalid_request");
    };
    let policy = match object_after(input, b"\"policy\"") {
        Some(value) => value,
        None => return error(output, b"invalid_request"),
    };
    if !unique_fields(
        input,
        &[
            b"\"model_ref\"",
            b"\"target\"",
            b"\"licence_ref\"",
            b"\"digest_evidence\"",
            b"\"signature_evidence\"",
            b"\"licence_evidence\"",
            b"\"runtime_compatibility\"",
            b"\"memory_required_bytes\"",
            b"\"policy\"",
        ],
    ) || !unique_fields(
        policy,
        &[
            b"\"version\"",
            b"\"allowed_targets\"",
            b"\"maximum_memory_bytes\"",
            b"\"unknown_evidence_action\"",
        ],
    ) {
        return error(output, b"invalid_request");
    }
    let policy_version = string_after(policy, b"\"version\"");
    let allowed_targets = string_array(policy, b"\"allowed_targets\"");
    let Some(max_memory) = number_after(policy, b"\"maximum_memory_bytes\"") else {
        return error(output, b"invalid_request");
    };
    let unknown_action = string_after(policy, b"\"unknown_evidence_action\"");
    if !safe_token(model_ref, 256)
        || !safe_token(target, 64)
        || !safe_token(licence_ref, 256)
        || !safe_token(policy_version, 128)
        || !evidence(digest)
        || !evidence(signature)
        || !matches!(licence, b"accepted" | b"rejected" | b"unknown")
        || !evidence(compatibility)
        || allowed_targets.invalid
        || allowed_targets.count == 0
        || !matches!(unknown_action, b"review" | b"reject")
    {
        return error(output, b"invalid_request");
    }

    let (decision, reason): (&[u8], &[u8]) = if !allowed_targets.contains(target) {
        (b"reject", b"target_not_allowed")
    } else if memory_required > max_memory {
        (b"reject", b"memory_budget_exceeded")
    } else if digest == b"failed" {
        (b"reject", b"digest_verification_failed")
    } else if signature == b"failed" {
        (b"reject", b"signature_verification_failed")
    } else if licence == b"rejected" {
        (b"reject", b"licence_not_accepted")
    } else if compatibility == b"failed" {
        (b"reject", b"runtime_incompatible")
    } else if digest == b"unknown"
        || signature == b"unknown"
        || licence == b"unknown"
        || compatibility == b"unknown"
    {
        if unknown_action == b"reject" {
            (b"reject", b"verification_evidence_unknown")
        } else {
            (b"review_required", b"verification_evidence_unknown")
        }
    } else {
        (b"activation_planned", b"policy_satisfied")
    };
    let mut w = Writer {
        bytes: output,
        at: 0,
    };
    w.bytes(b"{\"model_ref\":\"");
    w.bytes(model_ref);
    w.bytes(b"\",\"target\":\"");
    w.bytes(target);
    w.bytes(b"\",\"licence_ref\":\"");
    w.bytes(licence_ref);
    w.bytes(b"\",\"decision\":\"");
    w.bytes(decision);
    w.bytes(b"\",\"reason\":\"");
    w.bytes(reason);
    w.bytes(b"\",\"policy_version\":\"");
    w.bytes(policy_version);
    w.bytes(b"\"}");
    w.at
}

fn evidence(value: &[u8]) -> bool {
    matches!(value, b"verified" | b"failed" | b"unknown")
}
struct StringList<'a> {
    values: [&'a [u8]; 16],
    count: usize,
    invalid: bool,
}
impl StringList<'_> {
    fn contains(&self, value: &[u8]) -> bool {
        self.values[..self.count].iter().any(|item| *item == value)
    }
}
fn string_array<'a>(input: &'a [u8], key: &[u8]) -> StringList<'a> {
    let mut list = StringList {
        values: [b""; 16],
        count: 0,
        invalid: false,
    };
    let Some(array) = value_after(input, key) else {
        list.invalid = true;
        return list;
    };
    if array.first() != Some(&b'[') {
        list.invalid = true;
        return list;
    }
    let mut cursor = 1;
    loop {
        spaces(array, &mut cursor);
        if array.get(cursor) == Some(&b']') {
            break;
        }
        if array.get(cursor) != Some(&b'\"') || list.count == 16 {
            list.invalid = true;
            return list;
        }
        let start = cursor + 1;
        cursor += 1;
        while cursor < array.len() && array[cursor] != b'\"' {
            if array[cursor] == b'\\' {
                list.invalid = true;
                return list;
            }
            cursor += 1;
        }
        if cursor == start || cursor >= array.len() || !safe_token(&array[start..cursor], 64) {
            list.invalid = true;
            return list;
        }
        list.values[list.count] = &array[start..cursor];
        list.count += 1;
        cursor += 1;
        spaces(array, &mut cursor);
        if array.get(cursor) == Some(&b',') {
            cursor += 1;
            let mut next = cursor;
            spaces(array, &mut next);
            if array.get(next) == Some(&b']') {
                list.invalid = true;
                return list;
            }
        } else if array.get(cursor) != Some(&b']') {
            list.invalid = true;
            return list;
        }
    }
    list
}
fn object_after<'a>(input: &'a [u8], key: &[u8]) -> Option<&'a [u8]> {
    let value = value_after(input, key)?;
    if value.first() == Some(&b'{') {
        Some(value)
    } else {
        None
    }
}
fn string_after<'a>(input: &'a [u8], key: &[u8]) -> &'a [u8] {
    let Some(value) = value_after(input, key) else {
        return b"";
    };
    if value.len() < 2 || value[0] != b'\"' || value[value.len() - 1] != b'\"' {
        return b"";
    }
    &value[1..value.len() - 1]
}
fn number_after(input: &[u8], key: &[u8]) -> Option<u64> {
    let value = value_after(input, key)?;
    if value.is_empty() || !value.iter().all(u8::is_ascii_digit) {
        return None;
    }
    let mut result = 0u64;
    for byte in value {
        result = result.checked_mul(10)?.checked_add((byte - b'0') as u64)?;
    }
    Some(result)
}
fn value_after<'a>(input: &'a [u8], key: &[u8]) -> Option<&'a [u8]> {
    let position = find(input, key)?;
    let colon = input[position + key.len()..]
        .iter()
        .position(|b| *b == b':')?
        + position
        + key.len()
        + 1;
    let mut start = colon;
    spaces(input, &mut start);
    let first = *input.get(start)?;
    let end = if first == b'{' || first == b'[' {
        let mut depth = 0i32;
        let mut quoted = false;
        let mut escaped = false;
        let mut found = None;
        for (offset, byte) in input[start..].iter().enumerate() {
            if quoted {
                if escaped {
                    escaped = false;
                } else if *byte == b'\\' {
                    escaped = true;
                } else if *byte == b'\"' {
                    quoted = false;
                }
                continue;
            }
            match *byte {
                b'\"' => quoted = true,
                b'{' | b'[' => depth += 1,
                b'}' | b']' => {
                    depth -= 1;
                    if depth == 0 {
                        found = Some(start + offset + 1);
                        break;
                    }
                }
                _ => {}
            }
        }
        found?
    } else if first == b'\"' {
        let mut offset = start + 1;
        let mut escaped = false;
        while offset < input.len() {
            if escaped {
                escaped = false;
            } else if input[offset] == b'\\' {
                escaped = true;
            } else if input[offset] == b'\"' {
                break;
            }
            offset += 1;
        }
        if offset >= input.len() {
            return None;
        }
        offset + 1
    } else {
        input[start..]
            .iter()
            .position(|b| matches!(*b, b',' | b'}' | b']' | b' ' | b'\n' | b'\r' | b'\t'))
            .map(|n| start + n)
            .unwrap_or(input.len())
    };
    Some(&input[start..end])
}
fn safe_token(value: &[u8], maximum: usize) -> bool {
    !value.is_empty()
        && value.len() <= maximum
        && value[0].is_ascii_alphanumeric()
        && value.iter().all(|b| {
            b.is_ascii_alphanumeric()
                || matches!(*b, b'.' | b'_' | b':' | b'/' | b'@' | b'+' | b'-')
        })
}
fn find(input: &[u8], key: &[u8]) -> Option<usize> {
    input.windows(key.len()).position(|window| window == key)
}
fn unique_fields(input: &[u8], keys: &[&[u8]]) -> bool {
    keys.iter().all(|key| {
        let mut count = 0usize;
        let key = &key[1..key.len() - 1];
        let mut cursor = 0usize;
        while cursor < input.len() {
            if input[cursor] != b'"' {
                cursor += 1;
                continue;
            }
            let start = cursor + 1;
            cursor += 1;
            let mut escaped = false;
            while cursor < input.len() {
                if escaped {
                    escaped = false;
                } else if input[cursor] == b'\\' {
                    escaped = true;
                } else if input[cursor] == b'"' {
                    let end = cursor;
                    cursor += 1;
                    let mut after = cursor;
                    spaces(input, &mut after);
                    if &input[start..end] == key && input.get(after) == Some(&b':') {
                        count += 1;
                    }
                    break;
                }
                cursor += 1;
            }
            if cursor >= input.len() {
                break;
            }
        }
        count == 1
    })
}
fn spaces(input: &[u8], at: &mut usize) {
    while input
        .get(*at)
        .is_some_and(|b| matches!(*b, b' ' | b'\n' | b'\r' | b'\t'))
    {
        *at += 1;
    }
}
fn error(output: &mut [u8], code: &[u8]) -> usize {
    let mut w = Writer {
        bytes: output,
        at: 0,
    };
    w.bytes(b"{\"result_class\":\"");
    w.bytes(code);
    w.bytes(b"\"}");
    w.at
}
struct Writer<'a> {
    bytes: &'a mut [u8],
    at: usize,
}
impl Writer<'_> {
    fn bytes(&mut self, value: &[u8]) {
        let end = self.at.saturating_add(value.len());
        if end <= self.bytes.len() {
            self.bytes[self.at..end].copy_from_slice(value);
            self.at = end;
        } else {
            self.at = 0;
        }
    }
}
#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    loop {}
}
