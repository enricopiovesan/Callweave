import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { HostAdapterRuntime } from '../src/host-adapter-runtime.mjs';
import { runDetectionResolveCompatible } from '../src/detection-resolve-compatible.mjs';

const contract = JSON.parse(
  await readFile(new URL('../traverse/contracts/callweave/detection-resolve/contract.json', import.meta.url), 'utf8'),
);
const adapterDocument = JSON.parse(
  await readFile(new URL('../traverse/host-adapters/local-first-host-adapters.json', import.meta.url), 'utf8'),
);

const runtime = new HostAdapterRuntime(adapterDocument);
const [provisional, unknown, surprising, rejected, invalidInput, unavailable, denied] =
  contract.use_cases.map(useCase => useCase.input_example);

const provisionalResult = runDetectionResolveCompatible({ request: provisional, runtime });
assert.equal(provisionalResult.status, 'completed');
assert.equal(provisionalResult.reason_code, 'ok');
assert.equal(provisionalResult.resolution_state, 'provisional');
assert.equal(provisionalResult.emitted_event_id, 'callweave.detection.provisional-created');
assert.match(provisionalResult.resolution_ref, /^resolution-/);

const unknownResult = runDetectionResolveCompatible({ request: unknown, runtime: new HostAdapterRuntime(adapterDocument) });
assert.equal(unknownResult.status, 'completed');
assert.equal(unknownResult.resolution_state, 'unknown');
assert.equal(unknownResult.emitted_event_id, 'callweave.detection.unknown-identified');

const surprisingResult = runDetectionResolveCompatible({ request: surprising, runtime: new HostAdapterRuntime(adapterDocument) });
assert.equal(surprisingResult.status, 'completed');
assert.equal(surprisingResult.resolution_state, 'surprising');
assert.equal(surprisingResult.emitted_event_id, 'callweave.detection.surprising-quarantined');
assert.deepEqual(surprisingResult.warnings, ['requires_review']);

const rejectedResult = runDetectionResolveCompatible({ request: rejected, runtime: new HostAdapterRuntime(adapterDocument) });
assert.equal(rejectedResult.status, 'completed');
assert.equal(rejectedResult.resolution_state, 'rejected');
assert.equal(rejectedResult.emitted_event_id, 'callweave.detection.rejected');

const invalidResult = runDetectionResolveCompatible({ request: invalidInput, runtime: new HostAdapterRuntime(adapterDocument) });
assert.equal(invalidResult.status, 'rejected');
assert.equal(invalidResult.reason_code, 'invalid_input');
assert.equal(invalidResult.resolution_ref, null);

const unavailableResult = runDetectionResolveCompatible({ request: unavailable, runtime: new HostAdapterRuntime(adapterDocument) });
assert.equal(unavailableResult.status, 'deferred');
assert.equal(unavailableResult.reason_code, 'dependency_unavailable');
assert.equal(unavailableResult.resolution_ref, null);

const deniedResult = runDetectionResolveCompatible({ request: denied, runtime: new HostAdapterRuntime(adapterDocument) });
assert.equal(deniedResult.status, 'rejected');
assert.equal(deniedResult.reason_code, 'policy_denied');
assert.equal(deniedResult.resolution_ref, null);

console.log('detection_resolve_compatible_smoke=passed');
