import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { HostAdapterRuntime } from '../src/host-adapter-runtime.mjs';
import { runUnknownOrganizeCompatible } from '../src/unknown-organize-compatible.mjs';

const contract = JSON.parse(
  await readFile(new URL('../traverse/contracts/callweave/unknown-organize/contract.json', import.meta.url), 'utf8'),
);
const adapterDocument = JSON.parse(
  await readFile(new URL('../traverse/host-adapters/local-first-host-adapters.json', import.meta.url), 'utf8'),
);

const runtime = new HostAdapterRuntime(adapterDocument);
const [happy, invalidInput, unavailable, denied] = contract.use_cases.map(useCase => useCase.input_example);

const happyResult = runUnknownOrganizeCompatible({ request: happy, runtime });
assert.equal(happyResult.status, 'completed');
assert.equal(happyResult.reason_code, 'ok');
assert.match(happyResult.unknown_cluster_ref, /^unknown-cluster-/);
assert.match(happyResult.trace_ref, /^trace-/);
assert.deepEqual(happyResult.warnings, []);

const invalidResult = runUnknownOrganizeCompatible({ request: invalidInput, runtime: new HostAdapterRuntime(adapterDocument) });
assert.equal(invalidResult.status, 'rejected');
assert.equal(invalidResult.reason_code, 'invalid_input');
assert.equal(invalidResult.unknown_cluster_ref, null);

const unavailableResult = runUnknownOrganizeCompatible({ request: unavailable, runtime: new HostAdapterRuntime(adapterDocument) });
assert.equal(unavailableResult.status, 'deferred');
assert.equal(unavailableResult.reason_code, 'dependency_unavailable');
assert.equal(unavailableResult.unknown_cluster_ref, null);

const deniedResult = runUnknownOrganizeCompatible({ request: denied, runtime: new HostAdapterRuntime(adapterDocument) });
assert.equal(deniedResult.status, 'rejected');
assert.equal(deniedResult.reason_code, 'policy_denied');
assert.equal(deniedResult.unknown_cluster_ref, null);

console.log('unknown_organize_compatible_smoke=passed');
