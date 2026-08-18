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
static mut OUTPUT: [u8; 1024] = [0; 1024];
const INPUT_CAPACITY: usize = 8192;
const OUTPUT_CAPACITY: usize = 1024;

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
        let len = create(input, output);
        let mut written = 0usize;
        let v = IoVec {
            buffer: core::ptr::addr_of!(OUTPUT).cast::<u8>(),
            length: len,
        };
        let _ = fd_write(1, &v, 1, &mut written);
    }
}

fn create(request: &[u8], out: &mut [u8]) -> usize {
    let close = match object_after(request, b"\"close\"") {
        Some(v) => v,
        None => return error_json(out, b"close.id is required"),
    };
    let policy = match object_after(request, b"\"policy\"") {
        Some(v) => v,
        None => return error_json(out, b"policy.version is required"),
    };
    let close_id = string_after(close, b"\"id\"");
    let coverage = string_after(close, b"\"coverage\"");
    let policy_version = string_after(policy, b"\"version\"");
    if close_id.is_empty() {
        return error_json(out, b"close.id is required");
    }
    if policy_version.is_empty() {
        return error_json(out, b"policy.version is required");
    }

    let evidence_count = count_array_items(array_after(close, b"\"observation_ids\""));
    let unknown_count = count_array_items(array_after(close, b"\"unknown_ids\""));
    let total = evidence_count + unknown_count;
    let uncertainty_millis = if total == 0 { 1000 } else { (1000 * unknown_count) / total };

    let mut at = 0usize;
    at = copy(out, at, b"{\"close_id\":\"");
    at = copy_json(out, at, close_id);
    at = copy(out, at, b"\",\"policy_version\":\"");
    at = copy_json(out, at, policy_version);
    at = copy(out, at, b"\",\"visual_facts\":{\"evidence_count\":");
    at = write_i32(out, at, evidence_count);
    at = copy(out, at, b",\"unknown_count\":");
    at = write_i32(out, at, unknown_count);
    at = copy(out, at, b",\"coverage\":\"");
    at = copy_json(out, at, coverage);
    at = copy(out, at, b"\",\"uncertainty_millis\":");
    at = write_i32(out, at, uncertainty_millis);
    copy(out, at, b"}}")
}

fn count_array_items(array: Option<&[u8]>) -> i32 {
    let Some(array) = array else { return 0 };
    let mut count = 0i32;
    let mut rest = array;
    while let Some(start) = find(rest, b"\"") {
        let after = &rest[start + 1..];
        let Some(end) = after.iter().position(|b| *b == b'"') else { break };
        count += 1;
        rest = &after[end + 1..];
    }
    count
}

fn error_json(out: &mut [u8], message: &[u8]) -> usize {
    let mut at = 0usize;
    at = copy(out, at, b"{\"error\":\"");
    at = copy_json(out, at, message);
    copy(out, at, b"\"}")
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
            b'{' | b'[' => depth += 1,
            b'}' | b']' => {
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

fn array_after<'a>(s: &'a [u8], key: &[u8]) -> Option<&'a [u8]> {
    let p = find(s, key)?;
    let c = s[p + key.len()..].iter().position(|b| *b == b':')?;
    let rest = skip(&s[p + key.len() + c + 1..]);
    if rest.first() != Some(&b'[') {
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

fn write_i32(out: &mut [u8], mut at: usize, mut n: i32) -> usize {
    if n == 0 {
        return copy(out, at, b"0");
    }
    let mut digits = [0u8; 10];
    let mut len = 0usize;
    while n > 0 {
        digits[len] = b'0' + (n % 10) as u8;
        n /= 10;
        len += 1;
    }
    while len > 0 {
        len -= 1;
        at = copy(out, at, &[digits[len]]);
    }
    at
}

#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    loop {}
}
