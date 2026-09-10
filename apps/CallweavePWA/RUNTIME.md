# Callweave PWA runtime boundary

The PWA is a presentation consumer of a host-provided Traverse runtime. It
does not contain a recording state machine, domain transitions, policy, or
local persistence logic.

## Part 1: transport integration

An embedded or local product host may provide the following configuration
before loading `main.js`:

```js
globalThis.CallweaveRuntimeConfig = {
  baseUrl: 'https://runtime.example.invalid',
  workspaceId: 'callweave-local',
  appId: 'callweave-foundation',
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

The client now has a transport-only `dispatchCommand()` method. It is not wired
to a recording button yet: Callweave does not currently have an activated
recording state machine or a native capture host binding. Once both exist, the
UI may send only the state machine's declared commands and render its ordered
runtime events; it will not choose or apply transitions, invent optimistic
state, or handle microphone capture itself.
