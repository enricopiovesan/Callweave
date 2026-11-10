# Model binding release checklist

The YAMNet package is now a verified, reusable WASM model binding candidate.
The checked-in binding descriptor verifies the exact model identity, manifest
digest, WASM digest, target, offline policy, and rights. It intentionally has
no public key, so it cannot activate accidentally.

Before enabling model execution in any Callweave app:

1. Publish the immutable Spec 138 model package and its signature through the
   Traverse Registry process.
2. Generate a Callweave-owned Ed25519 release key outside the repository.
3. Store only the public key and key id in the deployment configuration. Keep
   the private key in CI/release secret storage.
4. Replace the null trust fields in `model-binding.json` with the published
   key id and public key, then run `npm run model:binding:smoke`.
5. Run the browser host conformance and the app smoke suite before deployment.
6. Display the package license, attribution, redistribution, and commercial-use
   status in every app's settings/about surface.

The binding is not a species classifier. YAMNet is a broad AudioSet event gate;
species identification still requires a separately licensed specialist model
and the same binding/review process.
