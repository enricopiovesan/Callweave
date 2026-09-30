# Callweave model licensing

Callweave source code and generic business capabilities are distributed under the repository's MIT/Apache-2.0 dual license. Model artifacts are separate works and keep the license selected by their model authors.

## Current policy

- No model is considered installed or usable until its manifest declares its exact version, digest, target, source, license, attribution, redistribution terms, and commercial-use status.
- The default application remains model-neutral. A model is an optional package selected through the Traverse application manifest.
- Callweave follows the actual legal terms of each model and does not relicense, broaden, or infer rights. Models with permissive redistribution terms are preferred for the default package; legally restricted models may be offered only as explicit optional packages with their restrictions and attribution shown before activation.
- The initial implementation uses an existing third-party model when its rights and technical constraints can be verified. Custom training is deferred unless evaluation demonstrates that available models cannot meet the product's accuracy or coverage requirements.
- Missing, ambiguous, or conflicting rights are a hard stop: the package remains unavailable until its rights are clarified and recorded.
- Every model's license, attribution, source, redistribution terms, and commercial-use status are disclosed in the app and in the package documentation.
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

## Mandatory requirements for every Callweave app

Every native, web, and future target must follow the same model-rights rules:

1. Declare model dependencies by exact immutable ID, version, digest, target,
   and Registry reference.
2. Activate only after Traverse verifies signature, digest, target, rights, and
   application policy.
3. Show license, attribution, source, redistribution, commercial-use status,
   and conversion status before activation.
4. Ship or link the applicable license and NOTICE files with every model
   distribution.
5. Preserve model ID, version, digest, and attribution in detections, exports,
   reports, and unknown-sample ZIP files.
6. Refuse packages with missing, ambiguous, conflicting, revoked, or
   incompatible rights; never silently substitute another model.
7. Keep third-party model rights separate from Callweave's MIT/Apache source
   license and never imply that Callweave grants additional model rights.
8. Keep signing private keys outside the repository and release artifacts.

The Registry and Traverse prompts that define the upstream contracts are
[`traverse/REGISTRY_MODEL_LICENSE_REQUIREMENTS_PROMPT.md`](traverse/REGISTRY_MODEL_LICENSE_REQUIREMENTS_PROMPT.md)
and
[`traverse/TRAVERSE_MODEL_LICENSE_REQUIREMENTS_PROMPT.md`](traverse/TRAVERSE_MODEL_LICENSE_REQUIREMENTS_PROMPT.md).

## Model package checklist

1. Verify upstream license and model-specific terms.
2. Verify training-data and label-data obligations where supplied by the model author.
3. Build the target artifact without changing the model semantics.
4. Record the digest and sign the package.
5. Register the exact package reference with Traverse.
6. Run native and browser conformance tests.
7. Ship attribution and license notices beside the artifact.
