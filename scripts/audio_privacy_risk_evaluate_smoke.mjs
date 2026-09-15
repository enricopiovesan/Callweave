import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(await readFile(path.join(root, 'capabilities/audio.privacy-risk-evaluate/contract.json'), 'utf8'));
const wasm = await readFile(path.join(root, 'capabilities/audio.privacy-risk-evaluate/artifacts/privacy-risk-evaluate.wasm'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateInput = ajv.compile(contract.inputs.schema);
const validateOutput = ajv.compile(contract.outputs.schema);

async function invoke(input) {
  const request = Buffer.from(JSON.stringify(input));
  let requestOffset = 0;
  let instance;
  let output = Buffer.alloc(0);
  const imports = { wasi_snapshot_preview1: {
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
  } };
  ({ instance } = await WebAssembly.instantiate(wasm, imports));
  instance.exports._start();
  return JSON.parse(output.toString('utf8'));
}

const policy = { version: 'privacy-1', maximum_risk_score_millis: 300, incomplete_evidence_action: 'review_required', elevated_risk_action: 'deny' };
const validCases = [
  [{ subject_ref: 'asset:42', risk_score_millis: 120, evidence_complete: true, policy }, 'allow', 'risk_within_threshold'],
  [{ subject_ref: 'asset:42', risk_score_millis: 301, evidence_complete: true, policy }, 'deny', 'risk_exceeds_threshold'],
  [{ subject_ref: 'asset:42', risk_score_millis: 0, evidence_complete: false, policy }, 'review_required', 'evidence_incomplete'],
  [{ subject_ref: 'asset:42', risk_score_millis: 0, evidence_complete: false, policy: { ...policy, incomplete_evidence_action: 'deny' } }, 'deny', 'evidence_incomplete'],
];
for (const [input, decision, reason] of validCases) {
  assert.equal(validateInput(input), true, ajv.errorsText(validateInput.errors));
  const result = await invoke(input);
  assert.equal(result.decision, decision);
  assert.equal(result.reason, reason);
  assert.equal(validateOutput(result), true, ajv.errorsText(validateOutput.errors));
}
for (const input of [
  { subject_ref: '', risk_score_millis: 1, evidence_complete: true, policy },
  { subject_ref: 'asset:42', risk_score_millis: 1001, evidence_complete: true, policy },
  { subject_ref: 'asset:42', risk_score_millis: 10, evidence_complete: true, policy: { ...policy, elevated_risk_action: 'maybe' } },
]) {
  const result = await invoke(input);
  assert.deepEqual(result, { result_class: 'invalid_request' });
  assert.equal(validateOutput(result), true, ajv.errorsText(validateOutput.errors));
}
assert.deepEqual(await invoke({ subject_ref: 'asset:42', risk_score_millis: 1, evidence_complete: true, policy, padding: 'x'.repeat(9000) }), { result_class: 'input_limit_exceeded' });
console.log(`audio_privacy_risk_evaluate_wasm=passed valid=${validCases.length} invalid=4`);
