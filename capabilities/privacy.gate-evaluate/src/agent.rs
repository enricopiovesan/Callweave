#![no_std]
#![no_main]

#[repr(C)]
struct IoVec {
    buffer: *const u8,
    length: usize,
}

#[repr(C)]
struct IoVecMut {
    buffer: *mut u8,
    length: usize,
}

#[link(wasm_import_module = "wasi_snapshot_preview1")]
unsafe extern "C" {
    fn fd_read(fd: u32, vectors: *const IoVecMut, count: usize, read: *mut usize) -> u32;
    fn fd_write(fd: u32, vectors: *const IoVec, count: usize, written: *mut usize) -> u32;
}

static mut INPUT: [u8; 8192] = [0; 8192];
static mut OUTPUT: [u8; 512] = [0; 512];
const INPUT_CAPACITY: usize = 8192;
const OUTPUT_CAPACITY: usize = 512;

#[unsafe(no_mangle)]
pub extern "C" fn _start() {
    unsafe {
        let mut total = 0usize;
        loop {
            let mut n = 0usize;
            let v = IoVecMut {
                buffer: core::ptr::addr_of_mut!(INPUT).cast::<u8>().add(total),
                length: INPUT_CAPACITY - total,
            };
            if fd_read(0, &v, 1, &mut n) != 0 || n == 0 {
                break;
            }
            total += n;
            if total == INPUT_CAPACITY {
                break;
            }
        }
        let input = core::slice::from_raw_parts(core::ptr::addr_of!(INPUT).cast::<u8>(), total);
        let output = core::slice::from_raw_parts_mut(core::ptr::addr_of_mut!(OUTPUT).cast::<u8>(), OUTPUT_CAPACITY);
        let len = resolve(input, output);
        let mut written = 0usize;
        let v = IoVec {
            buffer: core::ptr::addr_of!(OUTPUT).cast::<u8>(),
            length: len,
        };
        let _ = fd_write(1, &v, 1, &mut written);
    }
}

fn resolve(request: &[u8], out: &mut [u8]) -> usize {
    let policy = match object_after(request, b"\"policy\"") {
        Some(v) => v,
        None => return 0,
    };
    let policy_version = string_after(policy, b"\"version\"");
    let minimum_speech_cases = int_after(policy, b"\"minimum_speech_cases\"").unwrap_or(i32::MAX);
    let maximum_false_negative_millis = int_after(policy, b"\"maximum_false_negative_millis\"").unwrap_or(-1);
    let total_cases = count_key(request, b"\"contains_speech\"");
    let speech_cases = count_pattern(request, b"\"contains_speech\":true");
    let detected_speech = count_pattern(request, b"\"contains_speech\":true,\"risk_detected\":true");
    let false_negatives = speech_cases.saturating_sub(detected_speech);
    let false_negative_millis = if speech_cases == 0 {
        1000
    } else {
        ((false_negatives * 1000) / speech_cases) as i32
    };

    let mut at = 0usize;
    at = copy(out, at, b"{\"policy_version\":\"");
    at = copy_json(out, at, policy_version);
    at = copy(out, at, b"\",\"total_cases\":");
    at = write_int(out, at, total_cases as i32);
    at = copy(out, at, b",\"speech_cases\":");
    at = write_int(out, at, speech_cases as i32);
    at = copy(out, at, b",\"false_negatives\":");
    at = write_int(out, at, false_negatives as i32);
    at = copy(out, at, b",\"false_negative_millis\":");
    at = write_int(out, at, false_negative_millis);

    if (speech_cases as i32) < minimum_speech_cases {
        at = copy(out, at, b",\"decision\":\"reject\",\"reason\":\"insufficient_speech_cases\"}");
        return at;
    }
    if false_negative_millis > maximum_false_negative_millis {
        at = copy(out, at, b",\"decision\":\"reject\",\"reason\":\"false_negative_limit_exceeded\"}");
        return at;
    }
    copy(out, at, b",\"decision\":\"approve_for_policy\",\"reason\":\"privacy_gate_passed\"}")
}

fn skip(mut s: &[u8]) -> &[u8] {
    while s.first().is_some_and(|b| matches!(*b, b' ' | b'\n' | b'\r' | b'\t')) {
        s = &s[1..];
    }
    s
}

fn find(s: &[u8], key: &[u8]) -> Option<usize> {
    s.windows(key.len()).position(|w| w == key)
}

fn balanced_end(s: &[u8]) -> Option<usize> {
    let mut depth = 0i32;
    let mut quoted = false;
    let mut escaped = false;
    for (i, &b) in s.iter().enumerate() {
        if quoted {
            if escaped {
                escaped = false;
            } else if b == b'\\' {
                escaped = true;
            } else if b == b'"' {
                quoted = false;
            }
            continue;
        }
        match b {
            b'"' => quoted = true,
            b'{' => depth += 1,
            b'}' => {
                depth -= 1;
                if depth == 0 {
                    return Some(i);
                }
            }
            _ => {}
        }
    }
    None
}

fn object_after<'a>(s: &'a [u8], key: &[u8]) -> Option<&'a [u8]> {
    let p = find(s, key)?;
    let c = s[p + key.len()..].iter().position(|b| *b == b':')?;
    let rest = skip(&s[p + key.len() + c + 1..]);
    if rest.first() != Some(&b'{') {
        return None;
    }
    Some(&rest[..=balanced_end(rest)?])
}

fn string_after<'a>(s: &'a [u8], key: &[u8]) -> &'a [u8] {
    let Some(p) = find(s, key) else { return b"" };
    let Some(c) = s[p + key.len()..].iter().position(|b| *b == b':') else { return b"" };
    let rest = skip(&s[p + key.len() + c + 1..]);
    if rest.first() != Some(&b'"') {
        return b"";
    }
    let rest = &rest[1..];
    match rest.iter().position(|b| *b == b'"') {
        Some(end) => &rest[..end],
        None => b"",
    }
}

fn int_after(s: &[u8], key: &[u8]) -> Option<i32> {
    let p = find(s, key)?;
    let c = s[p + key.len()..].iter().position(|b| *b == b':')?;
    let rest = skip(&s[p + key.len() + c + 1..]);
    let mut n = 0i32;
    let mut count = 0;
    for &b in rest {
        if !(b'0'..=b'9').contains(&b) {
            break;
        }
        n = n.checked_mul(10)?.checked_add((b - b'0') as i32)?;
        count += 1;
    }
    if count == 0 { None } else { Some(n) }
}

fn count_key(s: &[u8], key: &[u8]) -> usize {
    if key.is_empty() || s.len() < key.len() {
        return 0;
    }
    s.windows(key.len()).filter(|w| *w == key).count()
}

fn count_pattern(s: &[u8], pattern: &[u8]) -> usize {
    if pattern.is_empty() || s.len() < pattern.len() {
        return 0;
    }
    s.windows(pattern.len()).filter(|w| *w == pattern).count()
}

fn write_int(out: &mut [u8], mut at: usize, value: i32) -> usize {
    if value == 0 {
        return copy(out, at, b"0");
    }
    let mut n = value;
    if n < 0 {
        at = copy(out, at, b"-");
        n = -n;
    }
    let mut digits = [0u8; 12];
    let mut len = 0usize;
    let mut current = n as u32;
    while current > 0 {
        digits[len] = b'0' + (current % 10) as u8;
        current /= 10;
        len += 1;
    }
    while len > 0 {
        len -= 1;
        at = copy(out, at, &digits[len..len + 1]);
    }
    at
}

fn copy(out: &mut [u8], at: usize, bytes: &[u8]) -> usize {
    let end = at + bytes.len();
    if end > out.len() {
        return at;
    }
    out[at..end].copy_from_slice(bytes);
    end
}

fn copy_json(out: &mut [u8], mut at: usize, s: &[u8]) -> usize {
    for &b in s {
        at = match b {
            b'"' => copy(out, at, b"\\\""),
            b'\\' => copy(out, at, b"\\\\"),
            _ => copy(out, at, &[b]),
        };
    }
    at
}

#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    loop {}
}
