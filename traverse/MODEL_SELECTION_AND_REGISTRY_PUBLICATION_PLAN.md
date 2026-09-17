# Model selection and Registry publication plan

## Goal

Provide a replaceable specialist ensemble for animal-sound analysis while
keeping all business capabilities generic. Models are signed Traverse packages,
not hard-coded dependencies of Callweave capabilities.

## Planned specialist set

| Family | First candidate | Role | Current decision |
| --- | --- | --- | --- |
| Birds | BirdNET | Bird species candidate generation | Use for non-commercial research after exact artifact/license review |
| Broad non-birds | Nocturne v1.2 Teacher | Research baseline across non-bird taxa | Evaluate, do not deploy yet |
| Mammals | Custom Golden regional model using MegaDetector-Acoustic training pipeline | Elk, bears, cougar, moose, deer | Build after licensed data is assembled |
| Insects | InsectNet Research | Review-only insect presence/cicada/Orthoptera | Evaluate only; current artifact is not field-ready |
| Amphibians | Nocturne outputs or a dedicated compact classifier | Frog/toad/salamander candidates | Select after amphibian-specific validation |
| Fallback | General sound-event model | Animal/non-animal and unknown routing | Research baseline only; never claims species certainty |

The ensemble router selects models by configured `family`, location, target
profile, and policy. It never selects a model by mutable URL or provider name.

## Selection gates

No candidate becomes an executable dependency until all gates pass:

1. Exact upstream revision and immutable artifact digest recorded.
2. Separate license review for code, weights, labels, and source data.
3. Commercial-use and redistribution rights explicitly classified.
4. Input/output schemas and Traverse guest ABI conversion verified.
5. CPU-WASM memory, fuel, input, output, and timeout ceilings measured.
6. Golden-relevant evaluation set and negative controls scored.
7. Confidence calibration, unknown behavior, and false-positive review recorded.
8. Reproducible build evidence and provenance captured.
9. Human maintainer approval recorded.

## Traverse model package

Each accepted model is published as a package containing:

- `model.manifest.json` with exact identity, digests, schemas, limits, profile,
  license, attribution, provenance, and offline policy;
- `model.wasm` implementing the versioned CPU-WASM guest ABI;
- source/build revision evidence;
- test and benchmark evidence;
- license texts and attribution notices;
- package/pair digest and signature material.

The application manifest references only:

```json
{
  "model_id": "example.wildlife-mammal",
  "version": "1.0.0",
  "digest": "sha256:<immutable-package-digest>",
  "registry_ref": "registry:example.wildlife-mammal@1.0.0",
  "offline_allowed": true
}
```

## Registry publication workflow

1. Build and test the model package in a public, auditable source revision.
2. Generate and validate `model.manifest.json`.
3. Run CPU-WASM conformance, resource-limit, sandbox, and cross-target tests.
4. Run the model-specific benchmark and attach the report.
5. Open a Registry PR for the model package/reference using exact digests.
6. Declare capability/artifact licensing and usage rights using Registry Spec
   025 (implemented in Registry 0.23.0).
7. Pass Registry validation, spec alignment, governance, CLA, signing, and
   publication checks.
8. After merge, verify the signed artifact and generated index entry.
9. Provision the package into Traverse's verified cache and activate it.
10. Add the exact model pin to the Callweave application manifest.
11. Run offline warm-cache and missing-cache integration tests.

## Versioning and replacement

- A changed model, weights digest, labels, preprocessing, or ABI requires a
  new model version and package digest.
- Existing model packages remain immutable.
- Replacing one specialist does not change the `model.execute` capability or
  ensemble contract.
- Location configuration may enable/disable a specialist without changing its
  artifact identity.
- Deprecated or license-restricted models remain visible with their status;
  they are never silently substituted.

## Current execution order

1. Keep `fixture.echo` as the runtime conformance artifact.
2. Evaluate BirdNET as the first real bird specialist.
3. Evaluate Nocturne as a broad non-bird research baseline.
4. Assemble licensed Golden mammal data and train a compact specialist.
5. Evaluate amphibian and insect specialists independently.
6. Publish only candidates that pass all selection gates.

## Non-goals

- No model is selected solely because it is popular or easy to download.
- No broad event classifier is presented as confirmed species identification.
- No weights are embedded in Callweave capability source code.
- No capability contains BirdNET-, Nocturne-, or model-provider-specific logic.
