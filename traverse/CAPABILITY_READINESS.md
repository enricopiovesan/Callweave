# Callweave capability readiness

**Last verified:** 2026-08-17. “Ready” below means the portable business rule
exists and is smoke-tested. It does not mean an application contract is active
or that the host adapter is available.

| Contract | Portable business logic | Remaining activation boundary | Readiness |
|---|---|---|---|
| `location-initialize` | Candidate-set normalization/versioning | Source lookup + private persistence | Logic ready |
| `audio-source-configure` | Configuration validation only | Microphone discovery/calibration | Adapter required |
| `audio-capture` | Segment metadata policy | Microphone + file finalization | Adapter required |
| `audio-prepare` | Local WAV/FLAC decode, resample, windowing | Recording reference/storage | Logic ready |
| `coverage-assess` | Standalone WASM package | Day-record input/storage | Logic ready |
| `evidence-retain` | Standalone WASM package | Retention execution/storage | Logic ready |
| `privacy-protect` | Fail-closed review gate; Silero VAD readiness and privacy-evaluation gate verified | Labeled field evaluation + export adapter | Evaluation + adapter required |
| `model-manage` | Checksum/license/release gate | Model cache activation | Logic ready |
| `acoustics-classify` | Local BirdNET/Perch evidence runner | Prepared-audio/model host binding | Logic ready |
| `detection-resolve` | Calibrated policy resolver | Candidate/evidence record reads | Logic ready |
| `observation-manage` | Append-only observation transition | Durable state connector | Logic ready |
| `unknown-organize` | Embedding clustering + curation | Embedding/evidence record reads | Logic ready |
| `review-prepare` | Privacy-gated advisory package policy | Privacy model + optional LMM connector | Blocked by privacy |
| `knowledge-manage` | Human-approved version transition | Durable state connector | Logic ready |
| `model-improve` | Evaluation/release decision gate | Training/evaluation runner | Adapter required |
| `daily-create` | Canvas-plan facts + visual-parameter package | Renderer/archive connector | Logic ready |
| `daily-revise` | Immutable revision package | Artifact state/archive connector | Logic ready |
| `daily-close` | Idempotent close calculation | Scheduler + durable state connector | Logic ready |
| `operations-recover` | Idempotent replay planning | Durable state/backup connector | Logic ready |

## Binding rules

- The six standalone WASI packages under `capabilities/` are executable now.
- `src/business-logic.mjs` owns portable policy and transition rules.
- `src/append-only-state.mjs` owns in-memory append-only/idempotency semantics.
- A future host adapter may persist the state kernel’s records, but may not
  rewrite record payloads or bypass the business rules.
- All `traverse/contracts/callweave/*` remain `draft` until the approved
  Traverse connector bindings are available and real package evidence exists.
