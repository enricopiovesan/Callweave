# Callweave capability readiness

**Last verified:** 2026-08-20. “Ready” below means the portable business rule
exists and has deterministic smoke or fixture coverage. “Executable app
coverage” means the corresponding Callweave app-level surface has a checked-in
Traverse bundle that passes smoke, generate, validate, and register locally. It
does not mean the full production host adapter or external-provider boundary is
complete.

| Contract | Portable business logic | Executable app coverage | Remaining activation boundary | Readiness |
|---|---|---|---|
| `location-initialize` | Standalone WASM package + candidate-set normalization/versioning | Yes | Source lookup + private persistence | Compatible app executable |
| `audio-source-configure` | Configuration validation only | Yes | Microphone discovery/calibration | Compatible app executable |
| `audio-capture` | Segment metadata policy | Yes | Microphone + file finalization | Compatible app executable |
| `audio-prepare` | Local WAV/FLAC decode, resample, windowing | Yes | Recording reference/storage | Reconciled compatible app executable |
| `coverage-assess` | Standalone WASM package | Yes | Day-record input/storage | Compatible app executable |
| `evidence-retain` | Standalone WASM package | Yes | Retention execution/storage | Compatible app executable |
| `privacy-protect` | Standalone privacy gate evaluator + fail-closed review gate; Silero VAD readiness verified | Yes | Export sanitization + field/privacy adapter | Compatible app executable |
| `model-manage` | Checksum/license/release gate | Yes | Model cache activation | Compatible app executable |
| `acoustics-classify` | Local BirdNET/Perch evidence runner | Yes | Prepared-audio/model host binding | Compatible app executable |
| `detection-resolve` | Standalone WASM package + calibrated policy resolver | Yes | Candidate/evidence record reads | Reconciled compatible app executable |
| `observation-manage` | Standalone WASM package + append-only observation transition | Yes | Durable state connector | Compatible app executable |
| `unknown-organize` | Embedding clustering + curation | Yes | Embedding/evidence record reads | Compatible app executable |
| `review-prepare` | Standalone WASM package for privacy-gated advisory package policy | No | Privacy model + optional LMM connector | Pure logic ready; external-boundary reconciliation needed |
| `knowledge-manage` | Standalone WASM package + human-approved version transition | Yes | Durable state connector | Compatible app executable |
| `model-improve` | Standalone WASM package for evaluation/release decision gate | No | Training/evaluation runner | Logic ready; app blocked on missing training/release authority |
| `daily-create` | Standalone WASM package + canvas-plan facts + visual-parameter package | Yes | Renderer/archive connector | Compatible app executable |
| `daily-revise` | Immutable revision package | Yes | Artifact state/archive connector | Compatible app executable |
| `daily-close` | Standalone WASM package + idempotent close calculation | Yes | Scheduler + durable state connector | Compatible app executable |
| `operations-recover` | Standalone WASM package + idempotent replay planning | No | Durable state/backup/export connector | Logic ready; app blocked on missing network/backup authority |

## Binding rules

- The seventeen standalone WASI packages under `capabilities/` are executable now.
- Those same seventeen packages are bundled as a real Traverse application
  under `apps/callweave-foundation/`, and that bundle validates and registers
  locally through current Traverse CLI flows.
- The following Callweave app-level compatible Traverse bundles now also
  validate and register locally:
  `location-initialize`, `audio-source-configure`, `audio-capture`,
  `audio-prepare`, `acoustics-classify`, `privacy-protect`, `model-manage`,
  `coverage-assess`, `detection-resolve`, `daily-close`, `daily-create`,
  `daily-revise`, `evidence-retain`, `observation-manage`,
  `knowledge-manage`, and `unknown-organize`.
- The connector-free business rules for `location-initialize` still have
  deterministic JSON fixtures under `fixtures/pure-capabilities/`, while the
  app-level contract now also has compatible executable coverage.
- `src/business-logic.mjs` owns portable policy and transition rules.
- `src/append-only-state.mjs` owns in-memory append-only/idempotency semantics.
- A future host adapter may persist the state kernel’s records, but may not
  rewrite record payloads or bypass the business rules.
- All `traverse/contracts/callweave/*` remain `draft` until the corresponding
  Callweave application capabilities have executable package coverage and
  governed evidence, not because Traverse connector tickets are still open.

## Remaining honest gaps

1. `operations-recover` and `model-improve` depend on
   host authority that is not yet declared in the checked-in local host-adapter
   surface.
2. `review-prepare` remains blocked on the advisory LMM boundary and its final
   host/external execution rules.

## Local checks

```bash
npm run business-logic:smoke
npm run pure-capabilities:fixtures
node scripts/validate_traverse_contracts.mjs
node scripts/run_workflow_fixtures.mjs
npm run traverse:foundation:validate
npm run traverse:foundation:register
```
