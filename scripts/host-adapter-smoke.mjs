import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { HostAdapterRuntime } from '../src/host-adapter-runtime.mjs';

const document = JSON.parse(await readFile(new URL('../traverse/host-adapters/local-first-host-adapters.json', import.meta.url)));
const runtime = new HostAdapterRuntime(document);
assert.equal(runtime.authorize({ adapterId: 'local-state-store', operation: 'append' }).reason, 'inactive_adapter');
const activation = runtime.activate({ adapterId: 'local-state-store', target: 'local', configRef: { id: 'state-config-1' } });
assert.equal(activation.activated, true);
assert.equal(runtime.authorize({ adapterId: 'local-state-store', operation: 'append', payloadBytes: 100 }).authorized, true);
assert.equal(runtime.authorize({ adapterId: 'local-state-store', operation: 'append', payloadBytes: 2_000_000 }).reason, 'bounded_io_exceeded');
assert.equal(runtime.activate({ adapterId: 'unknown', target: 'local', configRef: { id: 'x' } }).reason, 'unbound_adapter');
console.log('host_adapter_smoke=passed');
