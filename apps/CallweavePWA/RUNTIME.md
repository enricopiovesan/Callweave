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
  workspaceId: 'callweave-pwa-live-local',
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
