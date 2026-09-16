#![no_std]
#![no_main]

const MAX_INPUT: usize = 8192;
const MAX_OUTPUT: usize = 2048;
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
    let subject_ref = string_after(input, b"\"subject_ref\"");
    let policy = match object_after(input, b"\"policy\"") {
        Some(value) => value,
        None => return error(output, b"invalid_request"),
    };
    let version = string_after(policy, b"\"version\"");
    let Some(risk) = unsigned_after(input, b"\"risk_score_millis\"") else {
        return error(output, b"invalid_request");
    };
    let Some(complete) = boolean_after(input, b"\"evidence_complete\"") else {
        return error(output, b"invalid_request");
    };
    let Some(threshold) = unsigned_after(policy, b"\"maximum_risk_score_millis\"") else {
        return error(output, b"invalid_request");
    };
    let incomplete_action = string_after(policy, b"\"incomplete_evidence_action\"");
    let elevated_action = string_after(policy, b"\"elevated_risk_action\"");
    if subject_ref.is_empty()
        || version.is_empty()
        || risk > 1000
        || threshold > 1000
        || !valid_action(incomplete_action)
        || !valid_action(elevated_action)
    {
        return error(output, b"invalid_request");
    }
    let (decision, reason): (&[u8], &[u8]) = if !complete {
        (incomplete_action, b"evidence_incomplete")
    } else if risk > threshold {
        (elevated_action, b"risk_exceeds_threshold")
    } else {
        (b"allow", b"risk_within_threshold")
    };
    let mut w = Writer {
        bytes: output,
        at: 0,
    };
    w.bytes(b"{\"subject_ref\":\"");
    w.bytes(subject_ref);
    w.bytes(b"\",\"risk_score_millis\":");
    w.number(risk);
    w.bytes(b",\"evidence_complete\":");
    w.bytes(if complete { b"true" } else { b"false" });
    w.bytes(b",\"decision\":\"");
    w.bytes(decision);
    w.bytes(b"\",\"reason\":\"");
    w.bytes(reason);
    w.bytes(b"\",\"policy_version\":\"");
    w.bytes(version);
    w.bytes(b"\"}");
    w.at
}
fn valid_action(action: &[u8]) -> bool {
    matches!(action, b"allow" | b"deny" | b"review_required")
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
fn unsigned_after(input: &[u8], key: &[u8]) -> Option<u32> {
    let value = value_after(input, key)?;
    if value.is_empty() {
        return None;
    }
    let mut result = 0u32;
    for byte in value {
        if !byte.is_ascii_digit() {
            return None;
        }
        result = result.checked_mul(10)?.checked_add((byte - b'0') as u32)?;
    }
    Some(result)
}
fn boolean_after(input: &[u8], key: &[u8]) -> Option<bool> {
    let value = value_after(input, key)?;
    match value {
        b"true" => Some(true),
        b"false" => Some(false),
        _ => None,
    }
}
fn value_after<'a>(input: &'a [u8], key: &[u8]) -> Option<&'a [u8]> {
    let pos = find(input, key)?;
    let colon = input[pos + key.len()..].iter().position(|b| *b == b':')? + pos + key.len() + 1;
    let mut start = colon;
    spaces(input, &mut start);
    let first = *input.get(start)?;
    let end = if first == b'{' {
        let mut depth = 0i32;
        let mut quote = false;
        let mut escaped = false;
        let mut found = None;
        for (index, byte) in input[start..].iter().enumerate() {
            if quote {
                if escaped {
                    escaped = false;
                } else if *byte == b'\\' {
                    escaped = true;
                } else if *byte == b'"' {
                    quote = false;
                }
                continue;
            }
            match *byte {
                b'"' => quote = true,
                b'{' => depth += 1,
                b'}' => {
                    depth -= 1;
                    if depth == 0 {
                        found = Some(start + index + 1);
                        break;
                    }
                }
                _ => {}
            }
        }
        found?
    } else if first == b'"' {
        let mut index = start + 1;
        let mut escaped = false;
        while index < input.len() {
            if escaped {
                escaped = false;
            } else if input[index] == b'\\' {
                escaped = true;
            } else if input[index] == b'"' {
                break;
            }
            index += 1;
        }
        if index >= input.len() {
            return None;
        }
        index + 1
    } else {
        input[start..]
            .iter()
            .position(|b| matches!(*b, b',' | b'}' | b']' | b' ' | b'\n' | b'\r' | b'\t'))
            .map(|n| start + n)
            .unwrap_or(input.len())
    };
    Some(&input[start..end])
}
fn find(input: &[u8], key: &[u8]) -> Option<usize> {
    input.windows(key.len()).position(|part| part == key)
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
    fn number(&mut self, mut value: u32) {
        let mut digits = [0u8; 10];
        let mut n = 0;
        loop {
            digits[n] = b'0' + (value % 10) as u8;
            n += 1;
            value /= 10;
            if value == 0 {
                break;
            }
        }
        while n > 0 {
            n -= 1;
            self.bytes(&digits[n..=n]);
        }
    }
}
#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    loop {}
}
