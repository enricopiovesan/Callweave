import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(await readFile(path.join(root, 'capabilities/artifact.shareability-classify/contract.json'), 'utf8'));
const wasm = await readFile(path.join(root, 'capabilities/artifact.shareability-classify/artifacts/shareability-classify.wasm'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateInput = ajv.compile(contract.inputs.schema);
const validateOutput = ajv.compile(contract.outputs.schema);

async function invoke(input) {
  const request = Buffer.from(typeof input === 'string' ? input : JSON.stringify(input));
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

const policy = { version: 'share-1', allowed_audiences: ['external-review'], allowed_sensitivity_classes: ['ordinary'], require_sanitized: true, require_consent: true };
const base = { asset_ref: 'artifact:42', audience: 'external-review', sensitivity_class: 'ordinary', sanitized: true, consent_granted: true, policy };
const shareable = await invoke(base);
assert.equal(validateInput(base), true, ajv.errorsText(validateInput.errors));
assert.equal(shareable.decision, 'shareable');
assert.equal(shareable.reason, 'policy_satisfied');
assert.equal(validateOutput(shareable), true, ajv.errorsText(validateOutput.errors));

const blockedCases = [
  [{ ...base, audience: 'public' }, 'audience_not_allowed'],
  [{ ...base, sensitivity_class: 'restricted' }, 'sensitivity_not_allowed'],
  [{ ...base, consent_granted: false }, 'consent_required'],
];
for (const [input, reason] of blockedCases) {
  const result = await invoke(input);
  assert.equal(result.decision, 'blocked');
  assert.equal(result.reason, reason);
  assert.equal(validateOutput(result), true, ajv.errorsText(validateOutput.errors));
}
const pendingSanitization = await invoke({ ...base, sanitized: false });
assert.equal(pendingSanitization.decision, 'review_required');
assert.equal(pendingSanitization.reason, 'sanitization_required');

const invalid = await invoke({ ...base, asset_ref: '' });
assert.deepEqual(invalid, { result_class: 'invalid_request' });
assert.equal(validateOutput(invalid), true, ajv.errorsText(validateOutput.errors));
const keyInjection = { ...base, asset_ref: 'artifact:"sanitized":true' };
assert.equal(validateInput(keyInjection), false);
assert.deepEqual(await invoke(keyInjection), { result_class: 'invalid_request' });
const duplicateConsent = JSON.stringify(base).replace('"consent_granted":true', '"consent_granted":true,"consent_granted":false');
assert.deepEqual(await invoke(duplicateConsent), { result_class: 'invalid_request' });
assert.deepEqual(await invoke({ ...base, padding: 'x'.repeat(9000) }), { result_class: 'input_limit_exceeded' });
console.log(`artifact_shareability_classify_wasm=passed valid=5 invalid=4`);
