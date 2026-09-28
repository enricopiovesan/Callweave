# Callweave PWA runtime boundary

Callweave embeds Traverse 0.13.0 directly in the browser. The UI dispatches
runtime-declared commands and renders ordered runtime events; it does not own a
recording state machine, transition, policy, or analysis result.

`embedded-runtime.js` supplies browser-only host authority:

- `audio.permission.request` asks the browser for microphone permission;
- `audio.capture` starts and stops the local `MediaRecorder` and returns an
  opaque local artifact reference;
- browser storage retains the audio bytes locally.

The portable state machine is
[`../callweave-pwa-runtime/app.manifest.json`](../callweave-pwa-runtime/app.manifest.json):
`idle → requesting_permission → ready → capturing → recorded → model_unavailable`.
Traverse owns every transition. The browser is only the microphone and local
storage host.

`model_unavailable` is intentional until Callweave has a signed, licensed,
evaluated wildlife model package declared as an exact Traverse model dependency.
The bundled generic `inference.request-prepare` capability is not an animal
classifier and is never presented as one.

## Prepared embedded bundle

Run this after installing dependencies or updating Traverse:

```sh
npm run traverse:embedder:prepare
```

It creates ignored generated assets under `runtime/` and
`vendor/traverse-embedder-web/`. No loopback server, token, or remote runtime
configuration is required to test the PWA.

## Shared application surface

The complete, UI-independent Callweave capability and workflow inventory is
generated from the Foundation manifest in
[`../CALLWEAVE_SHARED_SURFACE.md`](../CALLWEAVE_SHARED_SURFACE.md). A product
surface can reveal only the routes appropriate to its users, but every route
must dispatch its declared Traverse command and render the returned state. It
must not reimplement a capability, transition, or policy in JavaScript.

Run `npm run traverse:shared-surface:validate` to validate the shared
capability catalogue. When the Foundation source changes, regenerate the
snapshot with `npm run traverse:shared-surface:generate` in that same
workspace.

## Local verification

`npm run traverse:embedder:smoke` loads the generated bundle through the
official embedded runtime, exercises permission, capture, and analysis, and
asserts the complete runtime-owned state sequence. It substitutes only the
microphone/storage host boundary, never the application state machine.
