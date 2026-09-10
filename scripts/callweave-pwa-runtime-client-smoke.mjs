import assert from 'node:assert/strict';
import { TraverseRuntimeClient } from '../apps/CallweavePWA/runtime-client.js';

const client = new TraverseRuntimeClient({
  baseUrl: 'https://runtime.example.test/',
  workspaceId: 'callweave-local',
  appId: 'callweave-foundation',
}, {
  fetchImpl: async () => ({ ok: true, json: async () => ({ status: 'ok', api_version: 'v1', workspace_default: 'callweave-local' }) }),
});

assert.deepEqual(await client.health(), {
  status: 'connected',
  workspaceId: 'callweave-local',
  apiVersion: 'v1',
});
assert.equal(
  client.eventsUrl(),
  'wss://runtime.example.test/v1/workspaces/callweave-local/apps/callweave-foundation/events',
);

const commands = [];
const commandClient = new TraverseRuntimeClient({
  baseUrl: 'https://runtime.example.test/', workspaceId: 'callweave-local', appId: 'callweave-foundation',
}, {
  fetchImpl: async (url, options) => {
    commands.push({ url, options });
    return { ok: true, json: async () => ({ status: 'accepted', session_id: 'sess-00000001', state: 'starting', execution_id: 'exec-00000001' }) };
  },
});
const accepted = await commandClient.dispatchCommand({
  command: 'start_listening', payload: { source_ref: 'source:local' }, sessionId: 'sess-00000001',
});
assert.equal(accepted.status, 'accepted');
assert.equal(commands[0].url, 'https://runtime.example.test/v1/workspaces/callweave-local/apps/callweave-foundation/commands');
assert.equal(commands[0].options.method, 'POST');
assert.deepEqual(JSON.parse(commands[0].options.body), {
  command: 'start_listening', payload: { source_ref: 'source:local' }, session_id: 'sess-00000001',
});

const unavailableClient = new TraverseRuntimeClient({
  baseUrl: 'http://127.0.0.1:8787', workspaceId: 'local', appId: 'callweave',
}, { fetchImpl: async () => { throw new Error('offline'); } });
assert.deepEqual(await unavailableClient.health(), { status: 'unavailable', reason: 'unreachable' });

console.log('callweave_pwa_runtime_client_smoke=passed');
