import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(await readFile(path.join(root, 'capabilities/retention.action-plan-create/contract.json'), 'utf8'));
const wasm = await readFile(path.join(root, 'capabilities/retention.action-plan-create/artifacts/action-plan-create.wasm'));
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

const policy = { version: 'retain-1', eligible_action: 'archive', grace_period_seconds: 86400, approval_required: true };
const base = { asset_ref: 'artifact:42', request_id: 'retention-plan-42', retention_state: 'eligible', evaluation_time_epoch_seconds: 1000, policy };
const planned = await invoke(base);
assert.equal(validateInput(base), true, ajv.errorsText(validateInput.errors));
assert.deepEqual(planned, { asset_ref: 'artifact:42', request_id: 'retention-plan-42', plan_state: 'planned', action: 'archive', approval_state: 'required', execute_after_epoch_seconds: 87400, reason: 'eligible_after_grace', policy_version: 'retain-1' });
assert.equal(validateOutput(planned), true, ajv.errorsText(validateOutput.errors));

for (const state of ['held', 'retained']) {
  const result = await invoke({ ...base, retention_state: state, policy: { ...policy, eligible_action: 'delete', grace_period_seconds: 0, approval_required: false } });
  assert.equal(result.plan_state, 'no_action');
  assert.equal(result.action, 'none');
  assert.equal(result.reason, 'not_eligible');
  assert.equal(validateOutput(result), true, ajv.errorsText(validateOutput.errors));
}
const deletion = await invoke({ ...base, policy: { ...policy, eligible_action: 'delete', approval_required: false } });
assert.equal(deletion.action, 'delete');
assert.equal(deletion.approval_state, 'not_required');
assert.equal(deletion.execute_after_epoch_seconds, 87400);
const overflowRequest = JSON.stringify({ ...base, policy: { ...policy, grace_period_seconds: 10 } }).replace('"evaluation_time_epoch_seconds":1000', '"evaluation_time_epoch_seconds":18446744073709551610');
const overflow = await invoke(overflowRequest);
assert.deepEqual(overflow, { result_class: 'time_overflow' });
assert.deepEqual(await invoke({ ...base, retention_state: 'eligible-ish' }), { result_class: 'invalid_request' });
const duplicate = JSON.stringify(base).replace('"retention_state":"eligible"', '"retention_state":"held","retention_state":"eligible"');
assert.deepEqual(await invoke(duplicate), { result_class: 'invalid_request' });
assert.deepEqual(await invoke({ ...base, padding: 'x'.repeat(5000) }), { result_class: 'input_limit_exceeded' });
console.log('retention_action_plan_create_wasm=passed planned=2 no_action=2 overflow=1 invalid=3');
