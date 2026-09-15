import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(await readFile(path.join(root, 'capabilities/audio.pcm-transform/contract.json'), 'utf8'));
const wasm = await readFile(path.join(root, 'capabilities/audio.pcm-transform/artifacts/pcm-transform.wasm'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateInput = ajv.compile(contract.inputs.schema);
const validateOutput = ajv.compile(contract.outputs.schema);

async function invoke(input, rawJson = null) {
  const request = Buffer.from(rawJson ?? JSON.stringify(input));
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
  ({ instance } = await WebAssembly.instantiate(wasm, imports));
  instance.exports._start();
  return JSON.parse(output.toString('utf8'));
}

const validCases = [
  {
    name: 'resample mono 8 kHz to 16 kHz',
    input: { input_sample_rate_hz: 8000, input_channel_count: 1, target_sample_rate_hz: 16000, target_channel_count: 1, samples_s16: [0, 2000] },
    expected: { result_class: 'transformed', sample_format: 's16le', input_sample_rate_hz: 8000, input_channel_count: 1, sample_rate_hz: 16000, channel_count: 1, frame_count: 4, samples_s16: [0, 1000, 2000, 2000] },
  },
  {
    name: 'downmix interleaved stereo to mono',
    input: { input_sample_rate_hz: 8000, input_channel_count: 2, target_sample_rate_hz: 8000, target_channel_count: 1, samples_s16: [-1000, 1000, 2000, 4000] },
    expected: { result_class: 'transformed', sample_format: 's16le', input_sample_rate_hz: 8000, input_channel_count: 2, sample_rate_hz: 8000, channel_count: 1, frame_count: 2, samples_s16: [0, 3000] },
  },
  {
    name: 'duplicate mono into stereo',
    input: { input_sample_rate_hz: 8000, input_channel_count: 1, target_sample_rate_hz: 8000, target_channel_count: 2, samples_s16: [-4, 9] },
    expected: { result_class: 'transformed', sample_format: 's16le', input_sample_rate_hz: 8000, input_channel_count: 1, sample_rate_hz: 8000, channel_count: 2, frame_count: 2, samples_s16: [-4, -4, 9, 9] },
  },
  {
    name: 'box low-pass cancels alternating Nyquist samples before downsampling',
    input: { input_sample_rate_hz: 16000, input_channel_count: 1, target_sample_rate_hz: 8000, target_channel_count: 1, samples_s16: [1000, -1000, 1000, -1000] },
    expected: { result_class: 'transformed', sample_format: 's16le', input_sample_rate_hz: 16000, input_channel_count: 1, sample_rate_hz: 8000, channel_count: 1, frame_count: 2, samples_s16: [0, 0] },
  },
];

for (const testCase of validCases) {
  assert.equal(validateInput(testCase.input), true, `${testCase.name}: input contract: ${ajv.errorsText(validateInput.errors)}`);
  const output = await invoke(testCase.input);
  assert.deepEqual(output, testCase.expected, testCase.name);
  assert.equal(validateOutput(output), true, `${testCase.name}: output contract: ${ajv.errorsText(validateOutput.errors)}`);
}

const invalidCases = [
  [{ input_sample_rate_hz: 4000, input_channel_count: 1, target_sample_rate_hz: 16000, target_channel_count: 1, samples_s16: [1] }, 'unsupported_sample_rate'],
  [{ input_sample_rate_hz: 8000, input_channel_count: 3, target_sample_rate_hz: 16000, target_channel_count: 1, samples_s16: [1, 2, 3] }, 'unsupported_channel_count'],
  [{ input_sample_rate_hz: 8000, input_channel_count: 2, target_sample_rate_hz: 8000, target_channel_count: 1, samples_s16: [1] }, 'invalid_samples'],
  [{ input_sample_rate_hz: 8000, input_channel_count: 1, target_sample_rate_hz: 8000, target_channel_count: 1, samples_s16: [32768] }, 'invalid_samples'],
];

for (const [input, expectedClass] of invalidCases) {
  const output = await invoke(input);
  assert.deepEqual(output, { result_class: expectedClass });
  assert.equal(validateOutput(output), true, `${expectedClass}: output contract: ${ajv.errorsText(validateOutput.errors)}`);
}

assert.deepEqual(
  await invoke(null, '{"input_sample_rate_hz":8000,"input_channel_count":1,"target_sample_rate_hz":8000,"target_channel_count":1,"samples_s16":[1,]}'),
  { result_class: 'invalid_samples' },
  'reject trailing comma in raw JSON sample array',
);

const largeInput = {
  input_sample_rate_hz: 8000,
  input_channel_count: 1,
  target_sample_rate_hz: 192000,
  target_channel_count: 1,
  samples_s16: Array.from({ length: 20001 }, () => 7),
};
assert.deepEqual(await invoke(largeInput), { result_class: 'output_limit_exceeded' });
assert.deepEqual(await invoke({ input_sample_rate_hz: 8000, input_channel_count: 1, target_sample_rate_hz: 8000, target_channel_count: 1, samples_s16: [1], padding: 'x'.repeat(4_000_000) }), { result_class: 'input_limit_exceeded' });

console.log(`audio_pcm_transform_wasm=passed valid=${validCases.length} invalid=${invalidCases.length + 2}`);
