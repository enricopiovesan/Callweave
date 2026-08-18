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
static mut OUTPUT: [u8; 2048] = [0; 2048];
const INPUT_CAPACITY: usize = 8192;
const OUTPUT_CAPACITY: usize = 2048;

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
        let len = close_day(input, output);
        let mut written = 0usize;
        let v = IoVec {
            buffer: core::ptr::addr_of!(OUTPUT).cast::<u8>(),
            length: len,
        };
        let _ = fd_write(1, &v, 1, &mut written);
    }
}

fn close_day(request: &[u8], out: &mut [u8]) -> usize {
    let location_id = string_after(request, b"\"locationId\"");
    let local_date = string_after(request, b"\"localDate\"");
    let coverage = string_after(request, b"\"coverage\"");
    let watermark = string_after(request, b"\"watermark\"");
    let policy = match object_after(request, b"\"policy\"") {
        Some(v) => v,
        None => return error_json(out, b"policy.version is required"),
    };
    let policy_version = string_after(policy, b"\"version\"");

    if location_id.is_empty() {
        return error_json(out, b"locationId is required");
    }
    if local_date.is_empty() {
        return error_json(out, b"localDate is required");
    }
    if watermark.is_empty() {
        return error_json(out, b"watermark is required");
    }
    if policy_version.is_empty() {
        return error_json(out, b"policy.version is required");
    }

    let mut observation_ids = [[0u8; 64]; 32];
    let mut unknown_ids = [[0u8; 64]; 32];
    let observation_count = parse_string_array(array_after(request, b"\"observationIds\""), &mut observation_ids);
    let unknown_count = parse_string_array(array_after(request, b"\"unknownIds\""), &mut unknown_ids);
    sort_fixed_strings(&mut observation_ids[..observation_count]);
    sort_fixed_strings(&mut unknown_ids[..unknown_count]);

    let mut at = 0usize;
    at = copy(out, at, b"{\"idempotency_key\":\"");
    at = copy_json(out, at, location_id);
    at = copy(out, at, b":");
    at = copy_json(out, at, local_date);
    at = copy(out, at, b":");
    at = copy_json(out, at, watermark);
    at = copy(out, at, b"\",\"location_id\":\"");
    at = copy_json(out, at, location_id);
    at = copy(out, at, b"\",\"local_date\":\"");
    at = copy_json(out, at, local_date);
    at = copy(out, at, b"\",\"coverage\":\"");
    at = copy_json(out, at, coverage);
    at = copy(out, at, b"\",\"observation_ids\":[");
    at = write_fixed_string_array(out, at, &observation_ids[..observation_count]);
    at = copy(out, at, b"],\"unknown_ids\":[");
    at = write_fixed_string_array(out, at, &unknown_ids[..unknown_count]);
    at = copy(out, at, b"],\"policy_version\":\"");
    at = copy_json(out, at, policy_version);
    copy(out, at, b"\"}")
}

fn parse_string_array(array: Option<&[u8]>, entries: &mut [[u8; 64]; 32]) -> usize {
    let Some(array) = array else { return 0 };
    let mut rest = array;
    let mut count = 0usize;
    while let Some(start) = find(rest, b"\"") {
        if count == entries.len() {
            break;
        }
        let after = &rest[start + 1..];
        let Some(end) = after.iter().position(|b| *b == b'"') else { break };
        let value = &after[..end];
        let len = if value.len() < 63 { value.len() } else { 63 };
        entries[count][..len].copy_from_slice(&value[..len]);
        entries[count][len] = 0;
        count += 1;
        rest = &after[end + 1..];
    }
    count
}

fn sort_fixed_strings(entries: &mut [[u8; 64]]) {
    let len = entries.len();
    let mut i = 0usize;
    while i < len {
      let mut j = i + 1;
      while j < len {
        if cmp_cstr(&entries[j], &entries[i]) < 0 {
            entries.swap(i, j);
        }
        j += 1;
      }
      i += 1;
    }
}

fn cmp_cstr(a: &[u8; 64], b: &[u8; 64]) -> i32 {
    let mut i = 0usize;
    while i < 64 {
        let av = a[i];
        let bv = b[i];
        if av == 0 && bv == 0 {
            return 0;
        }
        if av == 0 {
            return -1;
        }
        if bv == 0 {
            return 1;
        }
        if av < bv {
            return -1;
        }
        if av > bv {
            return 1;
        }
        i += 1;
    }
    0
}

fn write_fixed_string_array(out: &mut [u8], mut at: usize, entries: &[[u8; 64]]) -> usize {
    let mut i = 0usize;
    while i < entries.len() {
        if i > 0 {
            at = copy(out, at, b",");
        }
        at = copy(out, at, b"\"");
        let mut j = 0usize;
        while j < 64 && entries[i][j] != 0 {
            at = copy(out, at, &[entries[i][j]]);
            j += 1;
        }
        at = copy(out, at, b"\"");
        i += 1;
    }
    at
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

#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    loop {}
}
