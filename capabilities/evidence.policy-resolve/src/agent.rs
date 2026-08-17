#![no_std]
#![no_main]

#[repr(C)] struct IoVec { buffer: *const u8, length: usize }
#[repr(C)] struct IoVecMut { buffer: *mut u8, length: usize }
#[link(wasm_import_module = "wasi_snapshot_preview1")]
unsafe extern "C" { fn fd_read(fd: u32, vectors: *const IoVecMut, count: usize, read: *mut usize) -> u32; fn fd_write(fd: u32, vectors: *const IoVec, count: usize, written: *mut usize) -> u32; }
static mut INPUT: [u8; 8192] = [0; 8192];
static mut OUTPUT: [u8; 1024] = [0; 1024];

#[unsafe(no_mangle)]
pub extern "C" fn _start() { unsafe {
    let mut total = 0usize;
    loop { let mut n = 0usize; let v = IoVecMut { buffer: INPUT.as_mut_ptr().add(total), length: INPUT.len() - total }; if fd_read(0, &v, 1, &mut n) != 0 || n == 0 { break; } total += n; if total == INPUT.len() { break; } }
    let len = resolve(&INPUT[..total], &mut OUTPUT);
    let mut written = 0usize; let v = IoVec { buffer: OUTPUT.as_ptr(), length: len }; let _ = fd_write(1, &v, 1, &mut written);
} }

fn resolve(request: &[u8], out: &mut [u8]) -> usize {
    let evidence = match object_after(request, b"\"evidence\"") { Some(v) => v, None => return 0 };
    let policy = match object_after(request, b"\"resolution_policy\"") { Some(v) => v, None => return 0 };
    let claim = string_after(evidence, b"\"claim_id\"");
    let candidate = string_after(evidence, b"\"candidate_status\"");
    let version = string_after(policy, b"\"version\"");
    let score = int_after(evidence, b"\"score_millis\"").unwrap_or(0);
    let minimum = int_after(policy, b"\"minimum_score_millis\"").unwrap_or(1001);
    let compatible = bool_after(evidence, b"\"hardware_compatible\"").unwrap_or(false);
    let (state, reason): (&[u8], &[u8]) = if !compatible { (b"rejected", b"hardware_incompatible") } else if candidate == b"rare" && score >= minimum { (b"surprising", b"rare_candidate") } else if score >= minimum { (b"provisional", b"score_meets_policy") } else { (b"unknown", b"score_below_policy") };
    let mut at = 0usize; at = copy(out, at, b"{\"claim_id\":\""); at = copy_json(out, at, claim); at = copy(out, at, b"\",\"resolution_state\":\""); at = copy(out, at, state); at = copy(out, at, b"\",\"reason_code\":\""); at = copy(out, at, reason); at = copy(out, at, b"\",\"policy_version\":\""); at = copy_json(out, at, version); copy(out, at, b"\"}")
}

fn skip(mut s: &[u8]) -> &[u8] { while s.first().is_some_and(|b| matches!(*b, b' ' | b'\n' | b'\r' | b'\t')) { s = &s[1..]; } s }
fn find(s: &[u8], key: &[u8]) -> Option<usize> { s.windows(key.len()).position(|w| w == key) }
fn balanced_end(s: &[u8]) -> Option<usize> { let mut d = 0i32; let mut quoted = false; for (i, &b) in s.iter().enumerate() { if quoted { if b == b'\\' { continue; } if b == b'"' { quoted = false; } continue; } match b { b'"' => quoted = true, b'{' => d += 1, b'}' => { d -= 1; if d == 0 { return Some(i); } }, _ => {} } } None }
fn object_after<'a>(s: &'a [u8], key: &[u8]) -> Option<&'a [u8]> { let p = find(s, key)?; let colon = s[p + key.len()..].iter().position(|b| *b == b':')? + p + key.len(); let rest = skip(&s[colon + 1..]); if rest.first() != Some(&b'{') { return None; } Some(&rest[..=balanced_end(rest)?]) }
fn string_after<'a>(s: &'a [u8], key: &[u8]) -> &'a [u8] { let Some(p) = find(s, key) else { return b"" }; let Some(c) = s[p + key.len()..].iter().position(|b| *b == b':') else { return b"" }; let rest = skip(&s[p + key.len() + c + 1..]); if rest.first() != Some(&b'"') { return b"" } let rest = &rest[1..]; match rest.iter().position(|b| *b == b'"') { Some(end) => &rest[..end], None => b"" } }
fn int_after(s: &[u8], key: &[u8]) -> Option<i32> { let p = find(s, key)?; let c = s[p + key.len()..].iter().position(|b| *b == b':')?; let rest = skip(&s[p + key.len() + c + 1..]); let mut n = 0i32; let mut count = 0; for &b in rest { if !(b'0'..=b'9').contains(&b) { break; } n = n.checked_mul(10)?.checked_add((b - b'0') as i32)?; count += 1; } if count == 0 { None } else { Some(n) } }
fn bool_after(s: &[u8], key: &[u8]) -> Option<bool> { let p = find(s, key)?; let c = s[p + key.len()..].iter().position(|b| *b == b':')?; let rest = skip(&s[p + key.len() + c + 1..]); if rest.starts_with(b"true") { Some(true) } else if rest.starts_with(b"false") { Some(false) } else { None } }
fn copy(out: &mut [u8], at: usize, bytes: &[u8]) -> usize { let end = at + bytes.len(); if end > out.len() { return at; } out[at..end].copy_from_slice(bytes); end }
fn copy_json(out: &mut [u8], mut at: usize, s: &[u8]) -> usize { for &b in s { at = match b { b'"' => copy(out, at, b"\\\""), b'\\' => copy(out, at, b"\\\\"), _ => copy(out, at, &[b]) }; } at }
#[panic_handler] fn panic(_: &core::panic::PanicInfo<'_>) -> ! { loop {} }
