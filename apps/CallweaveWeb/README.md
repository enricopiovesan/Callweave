# CallweaveWeb

Browser test app for the current pre-connector Callweave foundation.

It exercises the same shared business-logic modules as the Node and macOS test
surfaces. Today it can run the browser-safe checks directly:

- pure capability fixtures
- business logic smoke

The other checks remain Node-only because they depend on local file-system
scripts rather than browser-safe modules.

## Model binding

The browser app is model-neutral until Traverse supplies a signed exact-ref
package. Application model pins use the Spec 044/138 shape validated by
`src/model-dependency.mjs`: model ID, version, manifest digest, `wasm-cpu`
target, offline policy, and license/commercial-use rights. The browser must
not infer an animal from a recording when no verified package is installed.

See [`MODEL_LICENSING.md`](../../MODEL_LICENSING.md) for the user-facing
license and attribution policy.

The current reusable model-binding candidate is documented in
[`traverse/MODEL_BINDING_RELEASE_CHECKLIST.md`](../../traverse/MODEL_BINDING_RELEASE_CHECKLIST.md).
It can be verified with `npm run model:binding:smoke`; production activation
remains disabled until a Callweave-owned trusted public key is provisioned.

## Run

Serve the repository root and open:

```text
/apps/CallweaveWeb/index.html
```
