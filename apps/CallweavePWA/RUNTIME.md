# Callweave PWA runtime boundary

The PWA is a presentation consumer of a host-provided Traverse runtime. It
does not contain domain transitions, policy, or local persistence logic. The
runtime-owned capture-request state machine lives in
`apps/callweave-pwa-runtime`.

## Part 1: transport integration

An embedded or local product host may provide the following configuration
before loading `main.js`:

```js
globalThis.CallweaveRuntimeConfig = {
  baseUrl: 'https://runtime.example.invalid',
  workspaceId: 'callweave-pwa-absolute-local',
  appId: 'callweave.pwa',
  // Optional host-provided development token. Never commit one.
  token: null,
};
```

`runtime-client.js` then uses the public Traverse surfaces only:

- `GET /healthz` to expose connection status;
- `POST /v1/workspaces/{workspace}/apps/{app}/commands` to submit one
  runtime-declared application command;
- `wss://.../v1/workspaces/{workspace}/apps/{app}/events` for a governed
  browser subscription once a request or execution ID exists.

The static GitHub Pages deployment has no configuration and therefore renders
`Runtime not connected`. It must not discover a loopback service, store a
token, or invent a fallback runtime.

## Part 2: state machine

The client has a transport-only `dispatchCommand()` method. The runtime app
declares `request_capture`, `retry`, and `reset`; clients may send those
commands and render ordered runtime events. `request_capture` creates only a
bounded capture plan. It is not wired to a recording button because microphone
capture still requires a native host binding; the UI will not invent optimistic
state or handle microphone capture itself.

`runtime-events.js` is deliberately a formatting adapter: it renders fields
from an already-ordered event or command response but never derives a state or
chooses a transition. The Place screen exposes connection, request, retry, and
event-timeline views through that adapter.

The native host boundary and its background-recording responsibilities are in
[`HOST_RECORDING_CONTRACT.md`](./HOST_RECORDING_CONTRACT.md).

## Local verification

`npm run traverse:pwa-runtime:setup` syncs, prepares, activates, and registers
this app in its local workspace. The manifest is valid when loaded with that
workspace's Registry resolver.

Current Traverse releases hydrate registered application state machines from
the persisted workspace index. A Registry-backed Callweave app is therefore
available through the HTTP command router after setup. The PWA renders the
accepted command response and eventual runtime events without simulating a
state change.

With Registry index `v295` and the updated Traverse runtime, a host-supplied
valid capture request completes the `core.create-audio-capture-request-plan`
capability and transitions the app session from `planning` to
`capture_planned`. This remains planning only; a native host decides whether
and how to perform a later recording operation.
