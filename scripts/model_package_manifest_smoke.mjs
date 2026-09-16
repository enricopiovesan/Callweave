import assert from 'node:assert/strict';
import { validateTraverseModelPackageManifest } from '../src/traverse-model-package.mjs';

const digest = '75d1573debb30016bf2cf5bac33d25abf28de8ef89a809109ffc503824a9e71a';
const valid = {
  schema_version: '1.0.0', model_id: 'fixture.echo', version: '1.0.0', wasm_digest: digest, package_digest: digest,
  registry_ref: 'registry:fixture.echo@1.0.0', executable_format: 'traverse-model-wasm', abi_version: 1,
  input_schema_ref: 'schema:fixture-in', input_schema_version: '1.0.0', output_schema_ref: 'schema:fixture-out', output_schema_version: '1.0.0',
  license_id: 'Apache-2.0', attribution: 'Traverse Spec 138 conformance fixture', supported_profiles: ['wasm-cpu'],
  max_memory_bytes: 131072, max_fuel: 1000000, max_input_bytes: 4096, max_output_bytes: 4096, max_execution_ms: 5000, offline_allowed: true,
};
const normalized = validateTraverseModelPackageManifest({ manifest: valid });
assert.equal(normalized.valid, true);
assert.throws(() => validateTraverseModelPackageManifest({ manifest: { ...valid, license_id: '' } }), /license_id/);
assert.throws(() => validateTraverseModelPackageManifest({ manifest: { ...valid, wasm_digest: 'bad' } }), /wasm_digest/);
assert.throws(() => validateTraverseModelPackageManifest({ manifest: { ...valid, supported_profiles: ['native'] } }), /wasm-cpu/);
assert.throws(() => validateTraverseModelPackageManifest({ manifest: { ...valid, offline_allowed: 'yes' } }), /offline_allowed/);
console.log('model_package_manifest=passed valid=1 invalid=4 wasm_cpu_required=true');
