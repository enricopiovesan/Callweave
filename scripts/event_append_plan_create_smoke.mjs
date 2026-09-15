import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(await readFile(path.join(root, 'capabilities/event.append-plan-create/contract.json'), 'utf8'));
const wasm = await readFile(path.join(root, 'capabilities/event.append-plan-create/artifacts/append-plan-create.wasm'));
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

const event = { event_id: 'event:42', event_type: 'record.transitioned', schema_version: '1.0.0', aggregate_ref: 'record:17', payload_ref: 'artifact:sha256:abc', occurred_at: '2026-09-14T12:00:00Z', causation_refs: ['event:40', 'event:41'], idempotency_key: 'event:42' };
assert.equal(validateInput(event), true, ajv.errorsText(validateInput.errors));
const result = await invoke(event);
const { idempotency_key, ...envelope } = event;
assert.deepEqual(result, { connector_id: 'traverse.event-store', operation: 'append', event: envelope, idempotency_key, result_class: 'planned' });
assert.equal(validateOutput(result), true, ajv.errorsText(validateOutput.errors));
const escapedReference = { ...event, event_id: 'event:"quoted"' };
assert.equal((await invoke(escapedReference)).event.event_id, escapedReference.event_id);

const invalid = [
  { ...event, event_id: '' },
  { ...event, causation_refs: Array(17).fill('event:x') },
  { ...event, causation_refs: [3] },
];
for (const input of invalid) {
  const output = await invoke(input);
  assert.equal(output.result_class, input.causation_refs?.length > 16 || input.causation_refs?.some((ref) => typeof ref !== 'string') ? 'invalid_causation_refs' : 'invalid_request');
  assert.equal(validateOutput(output), true, ajv.errorsText(validateOutput.errors));
}
assert.deepEqual(await invoke({ ...event, padding: 'x'.repeat(33_000) }), { result_class: 'input_limit_exceeded' });
console.log(`event_append_plan_create_wasm=passed valid=1 invalid=${invalid.length + 1}`);
