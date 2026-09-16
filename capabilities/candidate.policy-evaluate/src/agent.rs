#![no_std]
#![no_main]

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
static mut INPUT: [u8; 8193] = [0; 8193];
static mut OUTPUT: [u8; 2048] = [0; 2048];

#[unsafe(no_mangle)]
pub extern "C" fn _start() {
    unsafe {
        let mut total = 0usize;
        let input_ptr = core::ptr::addr_of_mut!(INPUT).cast::<u8>();
        while total < 8193 {
            let mut count = 0usize;
            let vector = IovecMut {
                buffer: input_ptr.add(total),
                length: 8193 - total,
            };
            if fd_read(0, &vector, 1, &mut count) != 0 || count == 0 {
                break;
            }
            total += count;
        }
        let input = core::slice::from_raw_parts(input_ptr, total);
        let output =
            core::slice::from_raw_parts_mut(core::ptr::addr_of_mut!(OUTPUT).cast::<u8>(), 2048);
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
    if input.len() > 8192 {
        return error(output, b"input_limit_exceeded");
    }
    let candidate_id = string_after(input, b"\"candidate_id\"");
    let status = string_after(input, b"\"candidate_status\"");
    let policy = match object_after(input, b"\"policy\"") {
        Some(value) => value,
        None => return error(output, b"invalid_request"),
    };
    let version = string_after(policy, b"\"version\"");
    let fallback = string_after(policy, b"\"unlisted_status_action\"");
    let accepted = string_array(policy, b"\"accepted_statuses\"");
    let excluded = string_array(policy, b"\"excluded_statuses\"");
    if candidate_id.is_empty()
        || status.is_empty()
        || version.is_empty()
        || fallback.is_empty()
        || !matches!(fallback, b"eligible" | b"excluded" | b"review")
        || accepted.invalid
        || excluded.invalid
    {
        return error(output, b"invalid_request");
    }

    let decision: &[u8] = if excluded.contains(status) {
        b"excluded"
    } else if accepted.contains(status) {
        b"eligible"
    } else {
        fallback
    };
    let reason: &[u8] = if excluded.contains(status) {
        b"status_explicitly_excluded"
    } else if accepted.contains(status) {
        b"status_explicitly_accepted"
    } else {
        b"status_not_configured"
    };
    let mut writer = Writer { out: output, at: 0 };
    writer.bytes(b"{\"candidate_id\":\"");
    writer.json(candidate_id);
    writer.bytes(b"\",\"candidate_status\":\"");
    writer.json(status);
    writer.bytes(b"\",\"decision\":\"");
    writer.bytes(decision);
    writer.bytes(b"\",\"reason\":\"");
    writer.bytes(reason);
    writer.bytes(b"\",\"policy_version\":\"");
    writer.json(version);
    writer.bytes(b"\"}");
    writer.at
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
    let mut result = StringList {
        values: [b""; 16],
        count: 0,
        invalid: false,
    };
    let Some(array) = value_after(input, key) else {
        result.invalid = true;
        return result;
    };
    if array.first() != Some(&b'[') {
        result.invalid = true;
        return result;
    }
    let mut cursor = 1usize;
    loop {
        spaces(array, &mut cursor);
        if array.get(cursor) == Some(&b']') {
            break;
        }
        if result.count == result.values.len() || array.get(cursor) != Some(&b'"') {
            result.invalid = true;
            return result;
        }
        let start = cursor + 1;
        cursor += 1;
        while cursor < array.len() && array[cursor] != b'"' {
            if array[cursor] == b'\\' {
                result.invalid = true;
                return result;
            }
            cursor += 1;
        }
        if cursor >= array.len() || cursor == start {
            result.invalid = true;
            return result;
        }
        result.values[result.count] = &array[start..cursor];
        result.count += 1;
        cursor += 1;
        spaces(array, &mut cursor);
        if array.get(cursor) == Some(&b',') {
            cursor += 1;
        } else if array.get(cursor) != Some(&b']') {
            result.invalid = true;
            return result;
        }
    }
    result
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
    if value.len() < 2 || value[0] != b'"' || value[value.len() - 1] != b'"' {
        return b"";
    }
    &value[1..value.len() - 1]
}
fn value_after<'a>(input: &'a [u8], key: &[u8]) -> Option<&'a [u8]> {
    let key_pos = find(input, key)?;
    let colon = input[key_pos + key.len()..]
        .iter()
        .position(|b| *b == b':')?
        + key_pos
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
                } else if *byte == b'"' {
                    quoted = false;
                }
                continue;
            }
            match *byte {
                b'"' => quoted = true,
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
    } else if first == b'"' {
        let mut offset = start + 1;
        let mut escaped = false;
        while offset < input.len() {
            if escaped {
                escaped = false;
            } else if input[offset] == b'\\' {
                escaped = true;
            } else if input[offset] == b'"' {
                break;
            }
            offset += 1;
        }
        if offset >= input.len() {
            return None;
        }
        offset + 1
    } else {
        return None;
    };
    Some(&input[start..end])
}
fn find(input: &[u8], key: &[u8]) -> Option<usize> {
    input.windows(key.len()).position(|window| window == key)
}
fn spaces(input: &[u8], at: &mut usize) {
    while input
        .get(*at)
        .is_some_and(|byte| matches!(*byte, b' ' | b'\n' | b'\r' | b'\t'))
    {
        *at += 1;
    }
}
fn error(out: &mut [u8], code: &[u8]) -> usize {
    let mut w = Writer { out, at: 0 };
    w.bytes(b"{\"result_class\":\"");
    w.bytes(code);
    w.bytes(b"\"}");
    w.at
}
struct Writer<'a> {
    out: &'a mut [u8],
    at: usize,
}
impl Writer<'_> {
    fn bytes(&mut self, bytes: &[u8]) {
        if self.at + bytes.len() <= self.out.len() {
            self.out[self.at..self.at + bytes.len()].copy_from_slice(bytes);
            self.at += bytes.len();
        }
    }
    fn json(&mut self, value: &[u8]) {
        // `string_after` returns the already-escaped JSON string contents.
        self.bytes(value);
    }
}
#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    loop {}
}
