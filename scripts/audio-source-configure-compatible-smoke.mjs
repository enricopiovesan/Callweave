import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { HostAdapterRuntime } from '../src/host-adapter-runtime.mjs';
import { runAudioSourceConfigureCompatible } from '../src/audio-source-configure-compatible.mjs';

const contract = JSON.parse(
  await readFile(new URL('../traverse/contracts/callweave/audio-source-configure/contract.json', import.meta.url), 'utf8'),
);
const adapterDocument = JSON.parse(
  await readFile(new URL('../traverse/host-adapters/local-first-host-adapters.json', import.meta.url), 'utf8'),
);

const runtime = new HostAdapterRuntime(adapterDocument);
const [happy, invalidInput, unavailable, denied] = contract.use_cases.map(useCase => useCase.input_example);

const happyResult = runAudioSourceConfigureCompatible({ request: happy, runtime });
assert.equal(happyResult.status, 'completed');
assert.equal(happyResult.reason_code, 'ok');
assert.match(happyResult.audio_source_ref, /^audio-source-/);
assert.match(happyResult.trace_ref, /^trace-/);
assert.deepEqual(happyResult.warnings, []);

const invalidResult = runAudioSourceConfigureCompatible({ request: invalidInput, runtime: new HostAdapterRuntime(adapterDocument) });
assert.equal(invalidResult.status, 'rejected');
assert.equal(invalidResult.reason_code, 'invalid_input');
assert.equal(invalidResult.audio_source_ref, null);

const unavailableResult = runAudioSourceConfigureCompatible({ request: unavailable, runtime: new HostAdapterRuntime(adapterDocument) });
assert.equal(unavailableResult.status, 'deferred');
assert.equal(unavailableResult.reason_code, 'dependency_unavailable');
assert.equal(unavailableResult.audio_source_ref, null);

const deniedResult = runAudioSourceConfigureCompatible({ request: denied, runtime: new HostAdapterRuntime(adapterDocument) });
assert.equal(deniedResult.status, 'rejected');
assert.equal(deniedResult.reason_code, 'policy_denied');
assert.equal(deniedResult.audio_source_ref, null);

console.log('audio_source_configure_compatible_smoke=passed');
