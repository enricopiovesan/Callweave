import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createSyntheticModelAdapter, sha256Digest } from '../src/model-adapter.mjs';

const root = path.resolve('sounds samples');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const modelManifest = {
  model_id: 'fixture.synthetic-checksum', version: '0.0.1',
  digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  input_schema_ref: 'tensor/audio-bytes-v1', output_schema_ref: 'scores/v1',
  targets: ['wasm32-wasi'], limits: { max_memory_bytes: 65536, max_input_bytes: 16, max_output_bytes: 8, max_execution_ms: 1000 },
};
const adapter = createSyntheticModelAdapter();
let verified = 0;
for (const sample of manifest.samples) {
  const bytes = fs.readFileSync(path.join(root, sample.path));
  assert.equal(sha256Digest(bytes), `sha256:${sample.sha256}`);
  const request = { request_id: `benchmark:${sample.id}`, model_ref: { model_id: modelManifest.model_id, version: modelManifest.version, digest: modelManifest.digest }, input_schema_ref: modelManifest.input_schema_ref, payload_bytes: [...bytes.subarray(0, 8)], limits: { timeout_ms: 100 } };
  const response = await adapter.infer({ request, manifest: modelManifest });
  assert.equal(response.status, 'ok');
  verified += 1;
}
console.log(`model_adapter_benchmark=passed samples=${verified} labels=unverified transport_only=true`);
