# Callweave model approval handoff

Updated 2026-11-12. This document is the approval boundary for the first
production model package. It does not grant rights or activate a model by
itself.

## Current recommendation

Use two separate roles:

1. **YAMNet `audio.yamnet.event-gate@1.0.0`** as the first browser-compatible
   broad sound-event gate. Its package records Apache-2.0 weights, AudioSet
   CC-BY-4.0 label attribution, exact manifest/WASM digests, and WASM CPU
   limits. It must not be presented as a species identifier.
2. **A specialist model** for animal-family/species evidence only after its
   exact artifact, rights, package size, cross-engine conformance, and held-out
   evaluation are accepted. No current specialist candidate meets that bar.

## Candidate disposition

| Candidate | Rights state | Evidence state | Decision |
|---|---|---|---|
| BirdNET | CC BY-NC-SA 4.0; non-commercial | Strong bird focus, but exact package and rights pin still required | Optional non-commercial specialist |
| Perch v2 | Source Apache-2.0 declaration; exact artifact redistribution rights unresolved | Browser inference works, but supplied elk/bear/cougar tests are weak and uncalibrated | Evaluation/reference only |
| Nocturne | Declared CC-BY; exact artifact rights unresolved | No approved exact WASM package or field evaluation | Review only |
| InsectNet research | Conditional/non-commercial | Research limitations and exact artifact rights unresolved | Review only |
| YAMNet ONNX | Apache-2.0 weights plus CC-BY-4.0 labels with attribution | Exact WASM package executes and passes binding smoke; broad event labels only | Event gate candidate |

## Required evidence before specialist promotion

- immutable model version and SHA-256 digest;
- Spec 138 manifest and WASM CPU target;
- package, memory, fuel, input, output, and execution-time limits;
- license, attribution, redistribution, and commercial-use record for the
  exact artifact and its labels;
- signed package and trusted public-key configuration;
- cross-engine conformance vector passing in the intended Traverse host;
- held-out positive examples and negative/background controls;
- calibration/abstention policy with `unknown` as a valid outcome;
- browser smoke test and evidence trace preserving model ID, version, digest,
  rights, and signer.

Run `npm run model:candidate-gates:verify` to regenerate the machine-readable
gate report. A candidate is never marked production-eligible by this command;
it only proves that the mechanical gates are complete and leaves human model
and legal approval explicit.

## Approval question

When the first specialist reaches this boundary, ask exactly one question:

> Do you approve this exact model package for the stated target, rights,
> evidence, and non-commercial/open-source distribution policy?

Until the answer is yes, the package remains evaluation-only and the runtime
must return `model_unavailable`, `unknown`, or evidence-only results rather
than an animal identification.

## Signing custody

Development signatures may use an ephemeral or locally protected Callweave
key. The private key must never enter Git. Production promotion requires a
separately protected key and a published public-key trust configuration; the
production key is not needed for local evaluation.
