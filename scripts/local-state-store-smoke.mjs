import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStateStore } from '../src/local-state-store.mjs';

const root = await mkdtemp(join(tmpdir(), 'callweave-state-'));
const firstStore = await LocalStateStore.open(root);
const first = await firstStore.append({ type: 'observation', payload: { id: 'o1', state: 'provisional' }, idempotencyKey: 'k1', timestamp: '2026-08-18T00:00:00Z' });
const secondStore = await LocalStateStore.open(root);
assert.equal((await secondStore.append({ type: 'observation', payload: { id: 'o1', state: 'provisional' }, idempotencyKey: 'k1', timestamp: '2026-08-18T00:00:00Z' })).replayed, true);
const successor = await secondStore.append({ type: 'observation', payload: { id: 'o1', state: 'verified' }, idempotencyKey: 'k2', timestamp: '2026-08-18T00:01:00Z' });
assert.equal(successor.previous_id, first.id); assert.equal(successor.version, 2); assert.equal(secondStore.resolve('observation', 'o1').payload.state, 'verified');
console.log('local_state_store_smoke=passed');
