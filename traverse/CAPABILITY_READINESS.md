# Callweave capability readiness

**Last verified:** 2026-08-20. “Ready” below means the portable business rule
exists and has deterministic smoke or fixture coverage. It does not mean the
full application contract is active or that every host adapter is already wired
for Callweave.

| Contract | Portable business logic | Remaining activation boundary | Readiness |
|---|---|---|---|
| `location-initialize` | Standalone WASM package + candidate-set normalization/versioning | Source lookup + private persistence | Logic ready |
| `audio-source-configure` | Configuration validation only | Microphone discovery/calibration | Adapter required |
| `audio-capture` | Segment metadata policy | Microphone + file finalization | Adapter required |
| `audio-prepare` | Local WAV/FLAC decode, resample, windowing | Recording reference/storage | Logic ready |
| `coverage-assess` | Standalone WASM package | Day-record input/storage | Logic ready |
| `evidence-retain` | Standalone WASM package | Retention execution/storage | Logic ready |
| `privacy-protect` | Fail-closed review gate; Silero VAD readiness and privacy-evaluation gate verified | Labeled field evaluation + export adapter | Evaluation + adapter required |
| `model-manage` | Checksum/license/release gate | Model cache activation | Logic ready |
| `acoustics-classify` | Local BirdNET/Perch evidence runner | Prepared-audio/model host binding | Logic ready |
| `detection-resolve` | Standalone WASM package + calibrated policy resolver | Candidate/evidence record reads | Logic ready |
| `observation-manage` | Standalone WASM package + append-only observation transition | Durable state connector | Logic ready |
| `unknown-organize` | Embedding clustering + curation | Embedding/evidence record reads | Logic ready |
| `review-prepare` | Privacy-gated advisory package policy | Privacy model + optional LMM connector | Blocked by privacy |
| `knowledge-manage` | Standalone WASM package + human-approved version transition | Durable state connector | Logic ready |
| `model-improve` | Evaluation/release decision gate | Training/evaluation runner | Adapter required |
| `daily-create` | Standalone WASM package + canvas-plan facts + visual-parameter package | Renderer/archive connector | Logic ready |
| `daily-revise` | Immutable revision package | Artifact state/archive connector | Logic ready |
| `daily-close` | Standalone WASM package + idempotent close calculation | Scheduler + durable state connector | Logic ready |
| `operations-recover` | Standalone WASM package + idempotent replay planning | Durable state/backup connector | Logic ready |

## Binding rules

- The thirteen standalone WASI packages under `capabilities/` are executable now.
- Those same thirteen packages are now bundled as a real Traverse application
  under `apps/callweave-foundation/`, and that bundle validates and registers
  locally through current Traverse CLI flows.
- The connector-free business rules for `location-initialize` have
  deterministic JSON fixtures under `fixtures/pure-capabilities/`.
- `src/business-logic.mjs` owns portable policy and transition rules.
- `src/append-only-state.mjs` owns in-memory append-only/idempotency semantics.
- A future host adapter may persist the state kernel’s records, but may not
  rewrite record payloads or bypass the business rules.
- All `traverse/contracts/callweave/*` remain `draft` until the corresponding
  Callweave application capabilities have executable package coverage and
  governed evidence, not because Traverse connector tickets are still open.

## Local checks

```bash
npm run business-logic:smoke
npm run pure-capabilities:fixtures
node scripts/validate_traverse_contracts.mjs
node scripts/run_workflow_fixtures.mjs
npm run traverse:foundation:validate
npm run traverse:foundation:register
```
