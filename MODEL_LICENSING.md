# Callweave model licensing

Callweave source code and generic business capabilities are distributed under the repository's MIT/Apache-2.0 dual license. Model artifacts are separate works and keep the license selected by their model authors.

## Current policy

- No model is considered installed or usable until its manifest declares its exact version, digest, target, source, license, attribution, redistribution terms, and commercial-use status.
- The default application remains model-neutral. A model is an optional package selected through the Traverse application manifest.
- BirdNET models are treated as non-commercial model packages. BirdNET documents its source code as MIT and its model artifacts as CC BY-NC-SA 4.0. The model license and attribution must travel with every redistribution.
- A model package must never be relabeled as MIT/Apache merely because Callweave or its adapter is MIT/Apache.
- Converted WASM artifacts are recorded as derived model artifacts and retain the upstream model's applicable restrictions.
- The app explains the model's rights before first activation. The user remains responsible for using a non-commercial model only for permitted purposes.

## Required model manifest fields

Every model package must provide:

```json
{
  "model_id": "example.model",
  "version": "1.0.0",
  "artifact_sha256": "sha256:<digest>",
  "license": "SPDX-or-custom-license-id",
  "license_url": "https://example.invalid/license",
  "source_url": "https://example.invalid/model",
  "attribution": ["Attribution text"],
  "redistribution": "allowed|restricted|forbidden",
  "commercial_use": "allowed|non-commercial-only|unknown",
  "derivative_policy": "permissive|same-license|restricted|unknown",
  "supported_targets": ["wasm32-wasi"],
  "status": "verified|pending-review|rejected"
}
```

Missing or unknown rights are not an approval. Traverse must reject activation of a package that has not passed signature, digest, target, and rights validation.

## User-facing disclosure

Each native and web app should show the selected model's license, attribution, source, and commercial-use status in Settings → Models. The first activation should link to the full license and state that Callweave does not grant additional rights.

## Model package checklist

1. Verify upstream license and model-specific terms.
2. Verify training-data and label-data obligations where supplied by the model author.
3. Build the target artifact without changing the model semantics.
4. Record the digest and sign the package.
5. Register the exact package reference with Traverse.
6. Run native and browser conformance tests.
7. Ship attribution and license notices beside the artifact.

