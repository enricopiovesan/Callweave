import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { HostAdapterRuntime } from '../src/host-adapter-runtime.mjs';
import { runReviewPrepareCompatible } from '../src/review-prepare-compatible.mjs';

const contract = JSON.parse(
  await readFile(new URL('../traverse/contracts/callweave/review-prepare/contract.json', import.meta.url), 'utf8'),
);
const adapterDocument = JSON.parse(
  await readFile(new URL('../traverse/host-adapters/local-first-host-adapters.json', import.meta.url), 'utf8'),
);

const runtime = new HostAdapterRuntime(adapterDocument);
const [happy, invalidInput, unavailable, denied] = contract.use_cases.map(useCase => useCase.input_example);

const happyResult = runReviewPrepareCompatible({ request: happy, runtime });
assert.equal(happyResult.status, 'completed');
assert.equal(happyResult.reason_code, 'ok');
assert.match(happyResult.review_proposal_ref, /^review-proposal-/);
assert.match(happyResult.trace_ref, /^trace-/);
assert.deepEqual(happyResult.warnings, []);

const invalidResult = runReviewPrepareCompatible({ request: invalidInput, runtime: new HostAdapterRuntime(adapterDocument) });
assert.equal(invalidResult.status, 'rejected');
assert.equal(invalidResult.reason_code, 'invalid_input');
assert.equal(invalidResult.review_proposal_ref, null);

const unavailableResult = runReviewPrepareCompatible({ request: unavailable, runtime: new HostAdapterRuntime(adapterDocument) });
assert.equal(unavailableResult.status, 'deferred');
assert.equal(unavailableResult.reason_code, 'dependency_unavailable');
assert.equal(unavailableResult.review_proposal_ref, null);

const deniedResult = runReviewPrepareCompatible({ request: denied, runtime: new HostAdapterRuntime(adapterDocument) });
assert.equal(deniedResult.status, 'rejected');
assert.equal(deniedResult.reason_code, 'policy_denied');
assert.equal(deniedResult.review_proposal_ref, null);

console.log('review_prepare_compatible_smoke=passed');
