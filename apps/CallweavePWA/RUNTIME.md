# Callweave PWA runtime boundary

Callweave embeds the Traverse web SDK 0.16.2 directly in the browser. The UI dispatches
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

## Model provisioning gate

The browser model path is deliberately fail-closed. A model is not enabled by
adding a label or a URL to the UI. Before activation, the application bundle
must declare one exact model pin and the host must register the matching signed
package with the Traverse web embedder. Verification covers the exact manifest
digest, Ed25519 signer, WASM digest, target, resource ceilings, and rights.

The current repository keeps the YAMNet package as an evaluation artifact only;
its WASM and development signature are not part of the checked-in PWA bundle.
Its reusable exact binding descriptor is checked in at
`../../artifacts/model-candidates/yamnet-onnx-v1/model-binding.json`. The
descriptor verifies package files and rights, but intentionally has a null
trust key until a release key is provisioned.
Until a governed provisioning step supplies both the package and its trusted
public key, recordings remain viewable but analysis returns
`model_unavailable`.

The browser host has also been exercised locally with an ephemeral development
key against the prepared YAMNet ABI-v3 package: signature admission, exact pin
matching, WASM digest verification, and a zero-valued `f32[160000]` frame all
passed and returned the expected 41,696-byte score output. That smoke evidence
does not make the ephemeral key a production trust root.

Run `npm run model:binding:smoke` to verify the descriptor and package digests.
It must report `pending_trusted_signer` until the deployment public key is
provided; that result is expected and is a fail-closed safety check.

## Prepared embedded bundle

Run this after installing dependencies or updating Traverse:

```sh
npm run traverse:pwa-runtime:prepare
npm run traverse:embedder:prepare
```

The first command syncs the signed Registry index and prepares the exact
component reference into the local verified cache. The second creates ignored
generated assets under `runtime/` and
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
