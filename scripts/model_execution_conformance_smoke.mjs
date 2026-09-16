import assert from 'node:assert/strict';
import { executeSyntheticModel } from '../src/model-execution-fixture.mjs';
import { normalizeInferenceResponse } from '../src/model-execution.mjs';

const manifest = {
  model_id: 'fixture.synthetic-checksum', version: '0.0.1',
  digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  input_schema_ref: 'tensor/audio-v1', output_schema_ref: 'scores/v1',
  targets: ['wasm32-wasi', 'native'],
  limits: { max_memory_bytes: 65536, max_input_bytes: 16, max_output_bytes: 8, max_execution_ms: 1000 },
};
const request = {
  request_id: 'fixture-1',
  model_ref: { model_id: manifest.model_id, version: manifest.version, digest: manifest.digest },
  input_schema_ref: manifest.input_schema_ref, payload_bytes: [1, 2, 3], limits: { timeout_ms: 100 },
};

const wasm = executeSyntheticModel({ request, manifest, target: 'wasm32-wasi' });
assert.equal(wasm.status, 'ok');
assert.deepEqual(wasm.output_bytes, [6, 0]);
assert.equal(wasm.placement, 'wasm-cpu');

const native = executeSyntheticModel({ request, manifest, target: 'native' });
assert.deepEqual(native.output_bytes, wasm.output_bytes);
assert.equal(native.status, wasm.status);

const cancelled = executeSyntheticModel({ request, manifest, cancelled: true });
assert.equal(cancelled.status, 'cancelled');
assert.equal(cancelled.retryable, false);

assert.throws(() => executeSyntheticModel({ request: { ...request, payload_bytes: Array(17).fill(1) }, manifest }), /input exceeds model limit/);
assert.throws(() => executeSyntheticModel({ request: { ...request, model_ref: { ...request.model_ref, digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' } }, manifest }), /model_ref/);

const timeout = normalizeInferenceResponse({ request, response: { status: 'timeout', model_ref: request.model_ref } });
assert.equal(timeout.retryable, true);
const invalid = normalizeInferenceResponse({ request, response: { status: 'invalid_input', reason_code: 'schema_mismatch' } });
assert.equal(invalid.retryable, false);
const unavailable = normalizeInferenceResponse({ request, response: { status: 'model_unavailable' } });
assert.equal(unavailable.retryable, true);

console.log('model_execution_conformance=passed cases=8 cross_target=identical');
