import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalObjectStore } from '../src/local-object-store.mjs';

const root = await mkdtemp(join(tmpdir(), 'callweave-store-'));
const store = new LocalObjectStore(root);
const result = await store.put({ assetId: 'recording-1', bytes: Buffer.from('wildlife evidence'), extension: 'json' });
assert.equal((await readFile(result.path)).toString(), 'wildlife evidence');
assert.equal(result.asset_ref.startsWith('sha256:'), true);
await assert.rejects(() => store.put({ assetId: '../unsafe', bytes: Buffer.from('x') }));
console.log('local_object_store_smoke=passed');
