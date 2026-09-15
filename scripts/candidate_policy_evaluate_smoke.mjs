import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(await readFile(path.join(root, 'capabilities/candidate.policy-evaluate/contract.json'), 'utf8'));
const wasm = await readFile(path.join(root, 'capabilities/candidate.policy-evaluate/artifacts/policy-evaluate.wasm'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateInput = ajv.compile(contract.inputs.schema);
const validateOutput = ajv.compile(contract.outputs.schema);

async function invoke(input) {
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
  ({ instance } = await WebAssembly.instantiate(wasm, imports));
  instance.exports._start();
  return JSON.parse(output.toString('utf8'));
}

const accepted = { candidate_id: 'item:42', candidate_status: 'available', policy: { version: 'policy-1', accepted_statuses: ['available', 'expected'], excluded_statuses: ['blocked'], unlisted_status_action: 'review' } };
assert.equal(validateInput(accepted), true, ajv.errorsText(validateInput.errors));
const acceptResult = await invoke(accepted);
assert.deepEqual(acceptResult, { candidate_id: 'item:42', candidate_status: 'available', decision: 'eligible', reason: 'status_explicitly_accepted', policy_version: 'policy-1' });
assert.equal(validateOutput(acceptResult), true, ajv.errorsText(validateOutput.errors));
const escapedIdentifier = { ...accepted, candidate_id: 'item:"quoted"' };
assert.equal((await invoke(escapedIdentifier)).candidate_id, escapedIdentifier.candidate_id);

const excludedPrecedence = { ...accepted, candidate_status: 'blocked', policy: { ...accepted.policy, accepted_statuses: ['blocked'] } };
assert.equal((await invoke(excludedPrecedence)).decision, 'excluded');
const fallbackReview = { ...accepted, candidate_status: 'new-status' };
assert.equal((await invoke(fallbackReview)).decision, 'review');
const fallbackAllow = { ...fallbackReview, policy: { ...accepted.policy, unlisted_status_action: 'eligible' } };
assert.equal((await invoke(fallbackAllow)).decision, 'eligible');
const fallbackExclude = { ...fallbackReview, policy: { ...accepted.policy, unlisted_status_action: 'excluded' } };
assert.equal((await invoke(fallbackExclude)).decision, 'excluded');

const invalid = [
  { ...accepted, candidate_id: '' },
  { ...accepted, policy: { ...accepted.policy, unlisted_status_action: 'guess' } },
  { ...accepted, policy: { ...accepted.policy, accepted_statuses: Array(17).fill('x') } },
];
for (const input of invalid) {
  const result = await invoke(input);
  assert.deepEqual(result, { result_class: 'invalid_request' });
  assert.equal(validateOutput(result), true, ajv.errorsText(validateOutput.errors));
}
assert.deepEqual(await invoke({ ...accepted, padding: 'x'.repeat(9000) }), { result_class: 'input_limit_exceeded' });
console.log(`candidate_policy_evaluate_wasm=passed valid=5 invalid=${invalid.length + 1}`);
