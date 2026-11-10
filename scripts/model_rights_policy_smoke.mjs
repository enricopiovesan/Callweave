import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluateModelRights } from '../src/model-rights-policy.mjs';

const manifest = JSON.parse(await readFile(new URL('../artifacts/model-candidates/yamnet-onnx-v1/traverse-package-v3/model.manifest.json', import.meta.url), 'utf8'));
const defaultResult = evaluateModelRights(manifest, { tier: 'default' });
assert.equal(defaultResult.approved, true);
assert.equal(defaultResult.activation, 'automatic-after-traverse-verification');

const restricted = {
  rights: { license_id: 'CC-BY-NC-SA-4.0', redistribution: 'allowed-with-terms', commercial_use: 'non-commercial-only', attribution: ['Author'] },
};
assert.equal(evaluateModelRights(restricted, { tier: 'optional-restricted' }).approved, true);
assert.equal(evaluateModelRights(restricted, { tier: 'optional-restricted' }).activation, 'explicit-user-consent');
assert.equal(evaluateModelRights(restricted, { tier: 'default' }).approved, false);
assert.throws(() => evaluateModelRights({ rights: { license_id: 'unknown', redistribution: 'unknown', commercial_use: 'unknown', attribution: ['x'] } }), /unknown/);
console.log('model_rights_policy=passed default=permissive optional=explicit unknown=rejected');
