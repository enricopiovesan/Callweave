import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(await readFile(path.join(root, 'capabilities/model.activation-plan-create/contract.json'), 'utf8'));
const wasm = await readFile(path.join(root, 'capabilities/model.activation-plan-create/artifacts/activation-plan-create.wasm'));
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

const policy = { version: 'activation-1', allowed_targets: ['wasm32-wasip2'], maximum_memory_bytes: 134217728, unknown_evidence_action: 'review' };
const base = { model_ref: 'model:sha256/abc123', target: 'wasm32-wasip2', licence_ref: 'Apache-2.0', digest_evidence: 'verified', signature_evidence: 'verified', licence_evidence: 'accepted', runtime_compatibility: 'verified', memory_required_bytes: 67108864, policy };
const planned = await invoke(base);
assert.equal(validateInput(base), true, ajv.errorsText(validateInput.errors));
assert.equal(planned.decision, 'activation_planned');
assert.equal(planned.reason, 'policy_satisfied');
assert.equal(validateOutput(planned), true, ajv.errorsText(validateOutput.errors));

const denied = [
  [{ ...base, target: 'native' }, 'target_not_allowed'],
  [{ ...base, memory_required_bytes: 134217729 }, 'memory_budget_exceeded'],
  [{ ...base, digest_evidence: 'failed' }, 'digest_verification_failed'],
  [{ ...base, signature_evidence: 'failed' }, 'signature_verification_failed'],
  [{ ...base, licence_evidence: 'rejected' }, 'licence_not_accepted'],
  [{ ...base, runtime_compatibility: 'failed' }, 'runtime_incompatible'],
];
for (const [input, reason] of denied) {
  const result = await invoke(input);
  assert.equal(result.decision, 'reject');
  assert.equal(result.reason, reason);
  assert.equal(validateOutput(result), true, ajv.errorsText(validateOutput.errors));
}
const unknown = await invoke({ ...base, signature_evidence: 'unknown' });
assert.equal(unknown.decision, 'review_required');
assert.equal(unknown.reason, 'verification_evidence_unknown');
const unknownLicence = await invoke({ ...base, licence_evidence: 'unknown' });
assert.equal(unknownLicence.decision, 'review_required');
assert.equal(unknownLicence.reason, 'verification_evidence_unknown');
const unknownDenied = await invoke({ ...base, digest_evidence: 'unknown', policy: { ...policy, unknown_evidence_action: 'reject' } });
assert.equal(unknownDenied.decision, 'reject');
const invalid = await invoke({ ...base, target: '' });
assert.deepEqual(invalid, { result_class: 'invalid_request' });
assert.equal(validateOutput(invalid), true, ajv.errorsText(validateOutput.errors));
const emptyTargets = { ...base, policy: { ...policy, allowed_targets: [] } };
assert.equal(validateInput(emptyTargets), false);
assert.deepEqual(await invoke(emptyTargets), { result_class: 'invalid_request' });
const trailingTargetComma = JSON.stringify(base).replace('"allowed_targets":["wasm32-wasip2"]', '"allowed_targets":["wasm32-wasip2",]');
assert.deepEqual(await invoke(trailingTargetComma), { result_class: 'invalid_request' });
const duplicateDigest = JSON.stringify(base).replace('"digest_evidence":"verified"', '"digest_evidence":"verified","digest_evidence":"failed"');
assert.deepEqual(await invoke(duplicateDigest), { result_class: 'invalid_request' });
assert.deepEqual(await invoke({ ...base, padding: 'x'.repeat(5000) }), { result_class: 'input_limit_exceeded' });
console.log('model_activation_plan_create_wasm=passed eligible=1 rejected=6 review=1 invalid=5');
