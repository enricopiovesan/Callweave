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
- `wss://.../v1/workspaces/{workspace}/apps/{app}/events` for a governed
  browser subscription once a request or execution ID exists.

The static GitHub Pages deployment has no configuration and therefore renders
`Runtime not connected`. It must not discover a loopback service, store a
token, or invent a fallback runtime.

## Part 2: state machine

Part 2 may introduce state-machine commands only after the mixed
local/Registry app activation path is available in Traverse. The UI will send
declared commands and render the runtime's ordered event messages; it will not
choose or apply transitions.
