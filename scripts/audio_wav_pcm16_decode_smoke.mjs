import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(await readFile(path.join(root, 'capabilities/audio.wav-pcm16-decode/contract.json'), 'utf8'));
const wasm = await readFile(path.join(root, 'capabilities/audio.wav-pcm16-decode/artifacts/wav-pcm16-decode.wasm'));
const transformWasm = await readFile(path.join(root, 'capabilities/audio.pcm-transform/artifacts/pcm-transform.wasm'));
const windowWasm = await readFile(path.join(root, 'capabilities/audio.pcm-window/artifacts/pcm-window.wasm'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateInput = ajv.compile(contract.inputs.schema);
const validateOutput = ajv.compile(contract.outputs.schema);

function chunk(id, payload) {
  const result = Buffer.alloc(8 + payload.length + (payload.length % 2));
  result.write(id, 0, 'ascii');
  result.writeUInt32LE(payload.length, 4);
  payload.copy(result, 8);
  return result;
}

function wave({ channels = 1, rate = 8000, samples = [0, 2000], tag = 1, bits = 16, oddMetadata = false, dataFirst = false } = {}) {
  const fmt = Buffer.alloc(16);
  fmt.writeUInt16LE(tag, 0);
  fmt.writeUInt16LE(channels, 2);
  fmt.writeUInt32LE(rate, 4);
  fmt.writeUInt32LE(rate * channels * (bits / 8), 8);
  fmt.writeUInt16LE(channels * (bits / 8), 12);
  fmt.writeUInt16LE(bits, 14);
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, index) => data.writeInt16LE(sample, index * 2));
  const chunks = [];
  if (dataFirst) chunks.push(chunk('data', data));
  chunks.push(chunk('fmt ', fmt));
  if (oddMetadata) chunks.push(chunk('JUNK', Buffer.from([0x45])));
  if (!dataFirst) chunks.push(chunk('data', data));
  const body = Buffer.concat([Buffer.from('WAVE'), ...chunks]);
  const header = Buffer.alloc(8);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}

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
        const memory = new Uint8Array(instance.exports.memory.buffer);
        const pointer = view.getUint32(vectorsPtr, true);
        const capacity = view.getUint32(vectorsPtr + 4, true);
        const length = Math.min(request.length - requestOffset, capacity);
        memory.set(request.subarray(requestOffset, requestOffset + length), pointer);
        requestOffset += length;
        view.setUint32(readPtr, length, true);
        return 0;
      },
      fd_write(fd, vectorsPtr, vectorCount, writtenPtr) {
        if (fd !== 1 || vectorCount !== 1) return 1;
        const view = new DataView(instance.exports.memory.buffer);
        const memory = new Uint8Array(instance.exports.memory.buffer);
        const pointer = view.getUint32(vectorsPtr, true);
        const length = view.getUint32(vectorsPtr + 4, true);
        output = Buffer.from(memory.slice(pointer, pointer + length));
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

const validCases = [
  { name: 'PCM16 mono', wav: wave(), expected: [0, 2000] },
  { name: 'PCM16 stereo with odd padded metadata chunk', wav: wave({ channels: 2, samples: [-32768, 32767, -3, 5], oddMetadata: true }), expected: [-32768, 32767, -3, 5] },
  { name: 'data chunk preceding format chunk', wav: wave({ samples: [-12, 45], dataFirst: true }), expected: [-12, 45] },
];
for (const testCase of validCases) {
  const input = { wav_bytes_base64: testCase.wav.toString('base64') };
  assert.equal(validateInput(input), true, `${testCase.name}: ${ajv.errorsText(validateInput.errors)}`);
  const result = await invoke(input);
  assert.equal(result.result_class, 'decoded');
  assert.deepEqual(result.samples_s16, testCase.expected, testCase.name);
  assert.equal(result.frame_count * result.channel_count, result.samples_s16.length);
  assert.equal(validateOutput(result), true, `${testCase.name}: ${ajv.errorsText(validateOutput.errors)}`);
}

const maximumSizedWav = wave({ samples: Array(480000).fill(-32768) });
const maximumSizedInput = { wav_bytes_base64: maximumSizedWav.toString('base64') };
assert.equal(validateInput(maximumSizedInput), true, ajv.errorsText(validateInput.errors));
const maximumSizedResult = await invoke(maximumSizedInput);
assert.equal(maximumSizedResult.samples_s16.length, 480000);
assert.equal(maximumSizedResult.frame_count, 480000);
assert.equal(maximumSizedResult.samples_s16[0], -32768);
assert.equal(maximumSizedResult.samples_s16.at(-1), -32768);
assert.equal(validateOutput(maximumSizedResult), true, ajv.errorsText(validateOutput.errors));
assert.deepEqual(await invoke({ wav_bytes_base64: Buffer.from('tiny').toString('base64'), padding: 'x'.repeat(4_000_000) }), { result_class: 'input_limit_exceeded' });

// Actual bounded preprocessing path: container bytes -> PCM -> model profile
// -> fixed windows. This checks that each independent capability's contract
// facts compose without any species/location-specific behavior.
const decoded = await invoke({ wav_bytes_base64: wave().toString('base64') });
const transformed = await runWasm(transformWasm, {
  input_sample_rate_hz: decoded.sample_rate_hz,
  input_channel_count: decoded.channel_count,
  target_sample_rate_hz: 16000,
  target_channel_count: 1,
  samples_s16: decoded.samples_s16,
});
const windowed = await runWasm(windowWasm, {
  sample_rate_hz: transformed.sample_rate_hz,
  channel_count: transformed.channel_count,
  source_offset_ms: 0,
  window_duration_ms: 1,
  hop_duration_ms: 1,
  is_final_chunk: true,
  samples_s16: transformed.samples_s16,
});
assert.equal(windowed.result_class, 'windowed');
assert.equal(windowed.windows[0].valid_frames, 4);
assert.deepEqual(windowed.windows[0].samples_s16.slice(0, 4), [0, 1000, 2000, 2000]);
assert.deepEqual(windowed.windows[0].samples_s16.slice(4), Array(12).fill(0));

const invalidCases = [
  [{ wav_bytes_base64: '***' }, 'invalid_audio_bytes'],
  [{ wav_bytes_base64: Buffer.from('not-wave').toString('base64') }, 'invalid_container'],
  [{ wav_bytes_base64: wave({ tag: 3 }).toString('base64') }, 'unsupported_format'],
  [{ wav_bytes_base64: wave({ rate: 4000 }).toString('base64') }, 'unsupported_sample_rate'],
  [{ wav_bytes_base64: wave({ channels: 3, samples: [1, 2, 3] }).toString('base64') }, 'unsupported_channel_count'],
];
const oddFrameWave = wave({ samples: [1] });
const oddFrameWithPad = Buffer.concat([oddFrameWave, Buffer.from([0, 0])]);
oddFrameWithPad.writeUInt32LE(3, 40);
oddFrameWithPad.writeUInt32LE(40, 4);
invalidCases.push([{ wav_bytes_base64: oddFrameWithPad.toString('base64') }, 'invalid_pcm_frames']);
for (const [input, expected] of invalidCases) {
  const result = await invoke(input);
  assert.deepEqual(result, { result_class: expected });
  assert.equal(validateOutput(result), true, `${expected}: ${ajv.errorsText(validateOutput.errors)}`);
}

const tooManySamples = wave({ samples: Array(480002).fill(1) });
assert.deepEqual(await invoke({ wav_bytes_base64: tooManySamples.toString('base64') }), { result_class: 'output_limit_exceeded' });
console.log(`audio_wav_pcm16_decode_wasm=passed valid=${validCases.length} bounded_max=1 pipeline=decode+transform+window invalid=${invalidCases.length + 2}`);
