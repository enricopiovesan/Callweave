import assert from 'node:assert/strict';
import { TraverseRuntimeClient } from '../apps/CallweavePWA/runtime-client.js';
import { commandResultView, runtimeEventView } from '../apps/CallweavePWA/runtime-events.js';

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

const sockets = [];
class FakeWebSocket {
  constructor(url) { this.url = url; this.listeners = new Map(); sockets.push(this); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  send(value) { this.sent = value; }
  emit(type, value = {}) { this.listeners.get(type)?.(value); }
  close() { this.closed = true; }
}
const events = [];
const eventClient = new TraverseRuntimeClient({
  baseUrl: 'https://runtime.example.test/', workspaceId: 'callweave-local', appId: 'callweave.pwa',
}, { webSocketImpl: FakeWebSocket });
const subscription = eventClient.subscribe({ executionId: 'exec-00000001', onMessage: event => events.push(event) });
assert.equal(subscription, sockets[0]);
sockets[0].emit('open');
assert.deepEqual(JSON.parse(sockets[0].sent), { type: 'subscribe', mode: 'browser_subscription', execution_id: 'exec-00000001' });
sockets[0].emit('message', { data: JSON.stringify({ type: 'state_changed', state: 'capture_planned', sequence: 4 }) });
assert.equal(runtimeEventView(events[0]).state, 'capture_planned');
assert.deepEqual(commandResultView({ state: 'planning', session_id: 'sess-1', execution_id: 'exec-1' }), { state: 'planning', sessionId: 'sess-1', executionId: 'exec-1' });

console.log('callweave_pwa_runtime_client_smoke=passed');
