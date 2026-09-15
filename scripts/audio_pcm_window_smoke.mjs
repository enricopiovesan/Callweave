import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(await readFile(path.join(root, 'capabilities/audio.pcm-window/contract.json'), 'utf8'));
const wasm = await readFile(path.join(root, 'capabilities/audio.pcm-window/artifacts/pcm-window.wasm'));
const transformWasm = await readFile(path.join(root, 'capabilities/audio.pcm-transform/artifacts/pcm-transform.wasm'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateInput = ajv.compile(contract.inputs.schema);
const validateOutput = ajv.compile(contract.outputs.schema);

async function runWasm(moduleBytes, input) {
  const request = Buffer.from(JSON.stringify(input));
  let requestOffset = 0;
  let instance;
  let output = Buffer.alloc(0);
  const imports = {
    wasi_snapshot_preview1: {
      fd_read(fd, vectorsPtr, vectorCount, readPtr) {
        if (fd !== 0 || vectorCount !== 1) return 1;
        const view = new DataView(instance.exports.memory.buffer);
        const bytes = new Uint8Array(instance.exports.memory.buffer);
        const bufferPtr = view.getUint32(vectorsPtr, true);
        const capacity = view.getUint32(vectorsPtr + 4, true);
        const length = Math.min(request.length - requestOffset, capacity);
        bytes.set(request.subarray(requestOffset, requestOffset + length), bufferPtr);
        requestOffset += length;
        view.setUint32(readPtr, length, true);
        return 0;
      },
      fd_write(fd, vectorsPtr, vectorCount, writtenPtr) {
        if (fd !== 1 || vectorCount !== 1) return 1;
        const view = new DataView(instance.exports.memory.buffer);
        const bytes = new Uint8Array(instance.exports.memory.buffer);
        const bufferPtr = view.getUint32(vectorsPtr, true);
        const length = view.getUint32(vectorsPtr + 4, true);
        output = Buffer.from(bytes.slice(bufferPtr, bufferPtr + length));
        view.setUint32(writtenPtr, length, true);
        return 0;
      },
    },
  };
  ({ instance } = await WebAssembly.instantiate(moduleBytes, imports));
  instance.exports._start();
  return JSON.parse(output.toString('utf8'));
}
const invoke = (input) => runWasm(wasm, input);

const base = { sample_rate_hz: 8000, channel_count: 1, source_offset_ms: 1000, window_duration_ms: 2, hop_duration_ms: 1, is_final_chunk: true };
const overlapping = { ...base, samples_s16: Array.from({ length: 24 }, (_, index) => index + 1) };
assert.equal(validateInput(overlapping), true, ajv.errorsText(validateInput.errors));
const overlapResult = await invoke(overlapping);
assert.deepEqual(overlapResult.windows, [
  { window_index: 0, start_ms: 1000, valid_frames: 16, samples_s16: Array.from({ length: 16 }, (_, index) => index + 1) },
  { window_index: 1, start_ms: 1001, valid_frames: 16, samples_s16: Array.from({ length: 16 }, (_, index) => index + 9) },
]);
assert.equal(validateOutput(overlapResult), true, ajv.errorsText(validateOutput.errors));

const partialTail = { ...base, samples_s16: Array.from({ length: 20 }, (_, index) => index + 1) };
const tailResult = await invoke(partialTail);
assert.deepEqual(tailResult.windows[1], { window_index: 1, start_ms: 1001, valid_frames: 12, samples_s16: [...Array.from({ length: 12 }, (_, index) => index + 9), ...Array(4).fill(0)] });
assert.equal(validateOutput(tailResult), true, ajv.errorsText(validateOutput.errors));
assert.equal(tailResult.windows[1].valid_frames, 12);
assert.deepEqual(tailResult.windows[1].samples_s16.slice(-4), [0, 0, 0, 0]);
assert.equal(tailResult.consumed_frames, 20);

// An intermediate chunk must retain the overlap instead of zero-padding a
// false end-of-recording. Continue from the unconsumed samples and verify the
// window start sequence has no gap at the chunk boundary.
const firstChunkSamples = Array.from({ length: 20 }, (_, index) => index + 1);
const firstChunk = await invoke({ ...base, is_final_chunk: false, samples_s16: firstChunkSamples });
assert.deepEqual(firstChunk.windows.map((window) => window.start_ms), [1000]);
assert.equal(firstChunk.consumed_frames, 8);
const carried = firstChunkSamples.slice(firstChunk.consumed_frames).concat([21, 22, 23, 24, 25, 26, 27, 28]);
const finalChunk = await invoke({ ...base, source_offset_ms: 1001, samples_s16: carried });
assert.deepEqual(finalChunk.windows.map((window) => window.start_ms), [1001, 1002]);
assert.deepEqual([...firstChunk.windows, ...finalChunk.windows].map((window) => window.start_ms), [1000, 1001, 1002]);
assert.equal(finalChunk.windows[1].valid_frames, 12);

const tooShortNonFinal = await invoke({ ...base, is_final_chunk: false, samples_s16: Array(8).fill(5) });
assert.deepEqual(tooShortNonFinal.windows, []);
assert.equal(tooShortNonFinal.consumed_frames, 0);
assert.equal(validateOutput(tooShortNonFinal), true, ajv.errorsText(validateOutput.errors));

const stereo = { ...base, channel_count: 2, samples_s16: Array.from({ length: 32 }, (_, index) => index) };
const stereoResult = await invoke(stereo);
assert.equal(stereoResult.windows[0].samples_s16.length, 32);
assert.equal(stereoResult.windows[0].valid_frames, 16);
assert.equal(validateOutput(stereoResult), true, ajv.errorsText(validateOutput.errors));

// Cross-capability smoke: normalize the source profile, then window its PCM.
const transformed = await runWasm(transformWasm, {
  input_sample_rate_hz: 8000,
  input_channel_count: 1,
  target_sample_rate_hz: 16000,
  target_channel_count: 1,
  samples_s16: Array.from({ length: 16 }, (_, index) => index * 100),
});
assert.equal(transformed.result_class, 'transformed');
const composed = await invoke({
  sample_rate_hz: transformed.sample_rate_hz,
  channel_count: transformed.channel_count,
  source_offset_ms: 250,
  window_duration_ms: 1,
  hop_duration_ms: 1,
  is_final_chunk: true,
  samples_s16: transformed.samples_s16,
});
assert.equal(composed.result_class, 'windowed');
assert.equal(composed.windows.length, 2);
assert.deepEqual(composed.windows.map(({ start_ms, valid_frames }) => ({ start_ms, valid_frames })), [{ start_ms: 250, valid_frames: 16 }, { start_ms: 251, valid_frames: 16 }]);

const invalidCases = [
  [{ ...base, sample_rate_hz: 4000, samples_s16: [1] }, 'unsupported_sample_rate'],
  [{ ...base, channel_count: 3, samples_s16: [1, 2, 3] }, 'unsupported_channel_count'],
  [{ ...base, hop_duration_ms: 0, samples_s16: [1] }, 'invalid_window_policy'],
  [{ ...base, hop_duration_ms: 3, samples_s16: [1] }, 'invalid_window_policy'],
  [{ ...base, sample_rate_hz: 44100, samples_s16: [1, 2] }, 'unaligned_window_policy'],
  [{ ...base, samples_s16: [32768] }, 'invalid_samples'],
];
for (const [input, resultClass] of invalidCases) {
  const result = await invoke(input);
  assert.deepEqual(result, { result_class: resultClass });
  assert.equal(validateOutput(result), true, ajv.errorsText(validateOutput.errors));
}

const expansionLimit = { ...base, window_duration_ms: 61_000, hop_duration_ms: 1, samples_s16: [1] };
assert.deepEqual(await invoke(expansionLimit), { result_class: 'output_limit_exceeded' });
assert.deepEqual(await invoke({ ...base, samples_s16: [1], padding: 'x'.repeat(4_000_000) }), { result_class: 'input_limit_exceeded' });
console.log(`audio_pcm_window_wasm=passed valid=3 composed=transform+window invalid=${invalidCases.length + 2}`);
