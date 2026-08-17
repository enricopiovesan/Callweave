#![no_std]
#![no_main]

#[repr(C)] struct IoVec { buffer: *const u8, length: usize }
#[repr(C)] struct IoVecMut { buffer: *mut u8, length: usize }
#[link(wasm_import_module = "wasi_snapshot_preview1")]
unsafe extern "C" { fn fd_read(fd: u32, vectors: *const IoVecMut, count: usize, read: *mut usize) -> u32; fn fd_write(fd: u32, vectors: *const IoVec, count: usize, written: *mut usize) -> u32; }
static mut INPUT: [u8; 8192] = [0; 8192]; static mut OUTPUT: [u8; 512] = [0; 512];

#[unsafe(no_mangle)] pub extern "C" fn _start() { unsafe {
    let mut total = 0usize; loop { let mut n = 0usize; let v = IoVecMut { buffer: INPUT.as_mut_ptr().add(total), length: INPUT.len() - total }; if fd_read(0, &v, 1, &mut n) != 0 || n == 0 { break; } total += n; if total == INPUT.len() { break; } }
    let len = assess(&INPUT[..total], &mut OUTPUT); let mut written = 0usize; let v = IoVec { buffer: OUTPUT.as_ptr(), length: len }; let _ = fd_write(1, &v, 1, &mut written);
} }

fn assess(request: &[u8], out: &mut [u8]) -> usize {
    let facts = match object_after(request, b"\"coverage_facts\"") { Some(v) => v, None => return 0 }; let policy = match object_after(request, b"\"coverage_policy\"") { Some(v) => v, None => return 0 };
    let expected = int_after(facts, b"\"expected_minutes\"").unwrap_or(0); let captured = int_after(facts, b"\"captured_minutes\"").unwrap_or(0); let valid = int_after(facts, b"\"valid_minutes\"").unwrap_or(0); let processed = int_after(facts, b"\"processed_minutes\"").unwrap_or(0); let threshold = int_after(policy, b"\"complete_threshold_millis\"").unwrap_or(1001); let version = string_after(policy, b"\"version\""); let healthy = string_after(facts, b"\"source_health\"") == b"healthy";
    let usable = min(min(captured, valid), processed); let millis = if expected > 0 { min(1000, usable.saturating_mul(1000) / expected) } else { 0 };
    let (state, reason): (&[u8], &[u8]) = if expected == 0 { (b"unavailable", b"invalid_scope") } else if !healthy { (b"unavailable", b"source_unhealthy") } else if millis >= threshold { (b"complete", b"coverage_complete") } else { (b"partial", b"coverage_partial") };
    let mut at = 0usize; at = copy(out, at, b"{\"coverage_state\":\""); at = copy(out, at, state); at = copy(out, at, b"\",\"coverage_millis\":"); at = write_i32(out, at, millis); at = copy(out, at, b",\"reason_code\":\""); at = copy(out, at, reason); at = copy(out, at, b"\",\"policy_version\":\""); at = copy_json(out, at, version); copy(out, at, b"\"}")
}
fn min(a: i32,b:i32)->i32 { if a < b { a } else { b } }
fn skip(mut s:&[u8])->&[u8] { while s.first().is_some_and(|b| matches!(*b,b' '|b'\n'|b'\r'|b'\t')) {s=&s[1..];} s }
fn find(s:&[u8],key:&[u8])->Option<usize>{s.windows(key.len()).position(|w|w==key)}
fn balanced_end(s:&[u8])->Option<usize>{let(mut d,mut q)=(0i32,false);for(i,&b)in s.iter().enumerate(){if q{if b==b'"'{q=false;}continue;}match b{b'"'=>q=true,b'{'=>d+=1,b'}'=>{d-=1;if d==0{return Some(i)}},_=>{}}}None}
fn object_after<'a>(s:&'a[u8],key:&[u8])->Option<&'a[u8]>{let p=find(s,key)?;let c=s[p+key.len()..].iter().position(|b|*b==b':')?;let r=skip(&s[p+key.len()+c+1..]);if r.first()!=Some(&b'{'){return None}Some(&r[..=balanced_end(r)?])}
fn string_after<'a>(s:&'a[u8],key:&[u8])->&'a[u8]{let Some(p)=find(s,key)else{return b""};let Some(c)=s[p+key.len()..].iter().position(|b|*b==b':')else{return b""};let r=skip(&s[p+key.len()+c+1..]);if r.first()!=Some(&b'"'){return b""};let r=&r[1..];match r.iter().position(|b|*b==b'"'){Some(e)=>&r[..e],None=>b""}}
fn int_after(s:&[u8],key:&[u8])->Option<i32>{let p=find(s,key)?;let c=s[p+key.len()..].iter().position(|b|*b==b':')?;let r=skip(&s[p+key.len()+c+1..]);let(mut n,mut c)=(0i32,0);for&b in r{if !(b'0'..=b'9').contains(&b){break}n=n.checked_mul(10)?.checked_add((b-b'0')as i32)?;c+=1;}if c==0{None}else{Some(n)}}
fn copy(out:&mut[u8],at:usize,b:&[u8])->usize{let end=at+b.len();if end>out.len(){return at}out[at..end].copy_from_slice(b);end}
fn copy_json(out:&mut[u8],mut at:usize,s:&[u8])->usize{for&b in s{at=copy(out,at,&[b]);}at}
fn write_i32(out:&mut[u8],mut at:usize,mut n:i32)->usize{if n==0{return copy(out,at,b"0")}let mut d=[0u8;10];let mut x=0;while n>0{d[x]=b'0'+(n%10)as u8;n/=10;x+=1;}while x>0{x-=1;at=copy(out,at,&[d[x]]);}at}
#[panic_handler] fn panic(_: &core::panic::PanicInfo<'_>) -> ! { loop {} }
