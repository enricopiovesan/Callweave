import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('..', import.meta.url).pathname;
async function invoke(path, input) {
  const bytes = await readFile(`${root}/${path}`); const request = Buffer.from(JSON.stringify(input)); let offset = 0; let instance; let out = Buffer.alloc(0);
  const imports = { wasi_snapshot_preview1: { fd_read(fd, ptr, count, readPtr) { if (fd !== 0 || count !== 1) return 1; const view = new DataView(instance.exports.memory.buffer); const bytes = new Uint8Array(instance.exports.memory.buffer); const p = view.getUint32(ptr, true); const cap = view.getUint32(ptr + 4, true); const n = Math.min(cap, request.length - offset); bytes.set(request.subarray(offset, offset + n), p); offset += n; view.setUint32(readPtr, n, true); return 0; }, fd_write(fd, ptr, count, writtenPtr) { if (fd !== 1 || count !== 1) return 1; const view = new DataView(instance.exports.memory.buffer); const bytes = new Uint8Array(instance.exports.memory.buffer); const p = view.getUint32(ptr, true); const n = view.getUint32(ptr + 4, true); out = Buffer.from(bytes.slice(p, p + n)); view.setUint32(writtenPtr, n, true); return 0; } } };
  ({ instance } = await WebAssembly.instantiate(bytes, imports)); instance.exports._start(); return JSON.parse(out.toString('utf8'));
}
const quality = await invoke('capabilities/audio.signal-quality-evaluate/artifacts/signal-quality-evaluate.wasm', { samples: [0, 1000, -1000, 2000], sample_rate_hz: 1000 });
assert.equal(quality.state, 'active'); assert.equal(quality.sample_count, 4); assert.equal(quality.clipping_samples, 0);
const intervals = await invoke('capabilities/audio.activity-interval-classify/artifacts/activity-interval-classify.wasm', { windows: [{ start_ms: 0, end_ms: 1000, state: 'quiet' }, { start_ms: 1000, end_ms: 2000, state: 'quiet' }, { start_ms: 2000, end_ms: 3000, state: 'active' }] });
assert.deepEqual(intervals.intervals, [{ start_ms: 0, end_ms: 2000, activity: 'silence', window_count: 2 }, { start_ms: 2000, end_ms: 3000, activity: 'possible-event', window_count: 1 }]);
console.log('audio_quality_activity_wasm=passed');
