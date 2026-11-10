import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { requireTrustedActivation, validateModelBinding, verifyModelBindingFiles } from '../src/model-binding.mjs';

const bindingUrl = new URL('../artifacts/model-candidates/yamnet-onnx-v1/model-binding.json', import.meta.url);
const binding = JSON.parse(await readFile(bindingUrl, 'utf8'));
const validated = validateModelBinding(binding);
assert.equal(validated.activation, 'pending_trusted_signer');
assert.equal(validated.model_dependency.rights.commercial_use, 'allowed');
const verified = await verifyModelBindingFiles(validated, new URL('../artifacts/model-candidates/yamnet-onnx-v1/', import.meta.url));
assert.equal(verified.manifest.model_id, 'audio.yamnet.event-gate');
assert.ok(verified.wasm_bytes > 1000);
assert.throws(() => requireTrustedActivation(validated), /trusted public key is not provisioned/);
console.log(`model_binding=passed files=verified activation=${validated.activation}`);
