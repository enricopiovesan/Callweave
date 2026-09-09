# Location-aware audio improvement plan

Status: active implementation plan  
First profile: `golden-bc` (Golden, British Columbia)  
Scope: generic, reusable business logic; no location is hard-coded into a capability.

## Objective

Improve animal-sound identification without treating model output as ecological
truth. Every recording produces auditable evidence, a location-aware candidate
view, and one of `verified`, `candidate`, or `unknown` only after deterministic
policy checks and (where applicable) human confirmation.

## Architecture decisions

- `LocationProfile` is configuration. It supplies timezone, habitat, season,
  privacy policy, candidate taxa, aliases, and calibration-set references.
- Golden is the first profile and acceptance fixture, not a special code path.
- Capabilities remain atomic and portable; UI, microphone, storage, and model
  engines remain host/runtime concerns.
- Raw model scores are retained for audit. They are never interpreted as
  calibrated probabilities without a versioned calibration policy.
- Raw audio stays local. External LMM review receives metadata/evidence only
  unless an explicitly approved privacy gate and human override permit clips.

## Delivery phases

### Phase 1 — Candidate-aware evidence (implemented)

- Add configurable location profiles under `config/locations/`.
- Accept `--candidates <profile.json>` in `analyze-audio`.
- Preserve global top-five labels.
- Emit scores and ranks for every configured candidate, including candidates
  outside the global top five or absent from a model taxonomy.
- Record candidate taxonomy/status alongside model evidence.
- Aggregate candidate evidence across windows with maximum score, mean active
  score, best global rank, and supporting-window count.
- Summarize quiet, active, and clipped windows per model (implemented).
- Compare local-candidate evidence across models, including unavailable and
  disagreement states (implemented).
- Include configured candidate evidence in the metadata-only review Markdown
  package (implemented).

### Phase 2 — Active-sound segmentation

- Record deterministic signal RMS and `quiet`/`active` window metadata (first
  slice implemented).
- Record peak level and clipping flags for every window (implemented).
- Detect silence, speech, engines, clipping, and low-SNR intervals.
- Classify active intervals before species ranking.
- Preserve interval timestamps, detector version, and quality metrics.
- Never discard raw windows from audit evidence; mark them as excluded by policy.

### Phase 3 — Golden calibration corpus

- Use the committed samples for elk, black bear, grizzly bear, and cougar.
- Maintain public-source candidates separately from approved imported samples;
  current iNaturalist CC-BY metadata candidates are recorded in
  `config/audio-source-candidates.json` without downloading their media.
- Run `npm run sound-samples:evaluate` to produce reproducible per-model
  candidate score/rank and audio-quality evidence for every committed sample
  (implemented).
- Run `npm run sound-samples:calibration-report` after evaluation to write a
  deterministic summary of candidate availability, rank buckets, and model
  coverage. This report is descriptive only; it deliberately selects no
  probability threshold.
- Add confirmed local bird, rain, vehicle, speech, silence, and mixed-noise clips.
- Record source URL/creator/date/license before redistribution or training use.
- Keep filename labels as hints until human confirmation is recorded.

### Phase 4 — Calibration and decision policy

- Measure per-species precision, recall, false positives, and false negatives.
- Calibrate thresholds separately for mammals, birds, and non-animal events.
- Require sufficient evidence and quality before returning `candidate`.
- Route weak, conflicting, or geographically implausible results to `unknown`.

### Phase 5 — Ensemble and taxonomy policy

- Combine Perch, BirdNET, and a sound-event/animal detector.
- Report model agreement/disagreement explicitly.
- Down-rank impossible taxa for the active profile while retaining raw evidence.
- Never allow a geographically impossible label to become a verified observation.

### Phase 6 — Specialized models (optional)

- Add an elk/bear/cougar model only after explicit artifact and license approval.
- Require WASM compatibility, memory/latency measurements, and reproducible
  checksums.
- Compare against calibrated Perch rather than replacing it blindly.

## Evidence schema additions

Each analysis should eventually include:

- active `location_profile_ref` and profile version;
- candidate taxon, common name, local status, raw score, rank, and availability;
- active interval and audio-quality metrics;
- model agreement and calibration policy version;
- provenance/license references;
- final status and reason code;
- privacy/export decision and audit trace.

## Acceptance tests

- Golden elk sample exposes `Cervus canadensis` as a candidate even outside the
  global top five.
- Golden black-bear sample exposes `Ursus americanus` when present in the model
  taxonomy.
- Grizzly and cougar samples remain distinct candidate fixtures.
- Human speech, engines, silence, and implausible taxa cannot become verified
  wildlife observations.
- A second location profile can be added without changing capability code.
- Re-running the same input and profile produces deterministic evidence.
- Raw audio is never present in the external review ZIP by default.

## Current status

- Phase 1 implemented and pushed (`271ddfb`).
- Four evaluation samples committed and hash-validated (`5a67afe`).
- Pinned BirdNET, Perch, and Silero VAD artifacts pass local WASM readiness.
- Traverse 0.20.0 preparation/validation/registration/activation passes.
- Phase 2–5 are the next implementation work; Phase 6 requires a separate
  model-artifact decision.
- A redistributable grizzly reference recording is still missing. Until source
  terms are verified, the user-confirmed grizzly clip remains evaluation-only.
