# Callweave End-to-End Pipeline Council Audit — 2026-08-11

**Remediation status:** Contract/event revisions below were applied on 2026-08-11. All artifacts remain draft until executable packages, connectors, and workflow fixtures exist.

## Method and scope

This audit applies the LLM Council pattern to the whole Callweave pipeline: independent first opinions from domain personas, cross-review/ranking, then one synthesis. It is a structured role-based review, not a claim that multiple external LLM providers were run.

The reviewed graph is the current 15-capability/15-event Traverse draft surface. Findings distinguish defects in the declared pipeline from deliberately deferred implementation work.

## Stage 1 — independent persona opinions

| Persona | Primary conclusion |
|---|---|
| Bioacoustician | The evidence-to-observation boundary is sound, but a single `detection.resolved` event cannot safely represent provisional, unknown, surprising, and rejected outcomes. |
| Privacy and safety reviewer | Privacy processing is ordered incorrectly: it consumes all prepared audio before the system knows which unknown clips will be submitted for LMM review. |
| UMA/Traverse runtime engineer | Event edges exist, but they do not yet encode deterministic routing, join semantics, or an executable workflow. Model availability should be a runtime constraint, not an event join. |
| Operations engineer | The pipeline cannot distinguish a quiet day from a microphone/power/model outage, and has no close-of-day watermark. |
| Wildlife-data steward | Candidate-set/version provenance is present, but source freshness, taxonomy reconciliation, and evidence retention need lifecycle policy before field use. |
| Artist/product designer | The canvas must be created exactly once for every local day, including a day with no detections or a known coverage gap. Current triggers can create duplicates or no canvas. |
| Local-first architect | Browser-only capture/storage is not yet proven for the chosen FLAC/24-bit/continuous workload; a local companion is a first-class P0 fallback, not an afterthought. |

## Stage 2 — ranked cross-review findings

| Rank | Finding | Severity | Why it matters |
|---:|---|---|---|
| 1 | `detection.resolved` fans out to both `observation-manage` and `unknown-organize` without a state-specific route. | Critical | Every resolved detection can be processed as both a known observation and an unknown cluster, corrupting state and daily counts. |
| 2 | `privacy-protect` consumes `audio.prepared`, while `review-prepare` requires both privacy and unknown events. | Critical | This can scan/archive too much raw audio, does not prove the selected unknown clips were sanitized, and creates an ambiguous event join. |
| 3 | `daily-create` has no local-day close trigger or idempotent daily key. | Critical | Multiple incoming events can render multiple canvases, while quiet days can render none. |
| 4 | `acoustics-classify` consumes `model.availability-changed`. | High | A model-availability event is a change notification, not a per-window prerequisite. It creates stalled or nondeterministic joins when the cache is already valid. |
| 5 | All contracts/events are draft and no WASM package, host connector, model artifact, or workflow definition exists. | High | The pipeline is architectural intent, not executable software; it must not be presented as runnable. |
| 6 | Coverage/health is not an input to daily summary/canvas. | High | The artwork cannot distinguish ecological silence from missing/corrupt audio, depleted power, or a failed model. |
| 7 | Retention is specified but not tied to reference counts, legal holds, review packages, or reprocessing requirements. | High | Storage cleanup can destroy evidence needed to correct observations or reproduce a canvas. |
| 8 | No concrete source-refresh/reconciliation workflow exists for candidate species data. | Medium | A generic location database will drift as occurrence sources, taxonomy, seasons, and range data change. |
| 9 | Threshold calibration and local false-positive evaluation are deferred without a P0 measurement baseline. | Medium | The first field deployment cannot quantify whether its art reflects animals or model noise. |
| 10 | A browser-only continuous recorder is unproven for long-duration lossless capture and storage. | Medium | The intended PWA may need a local companion recorder before it can meet the audio master policy. |

## Stage 3 — chairman synthesis

The architecture remains viable, but the current event graph is **not ready to become an active Traverse workflow**. Correct routing and close-of-day semantics are the governing prerequisites.

### Required pipeline revisions

1. Replace generic `callweave.detection.resolved` fan-out with explicit outcome facts:

   ```text
   detection.provisional-created
   detection.unknown-identified
   detection.surprising-quarantined
   detection.rejected
   ```

   `observation-manage` consumes only provisional/surprising events. `unknown-organize` consumes only unknown/surprising events. Rejection terminates with a trace but does not route into either path.

2. Move privacy processing after unknown-cluster selection:

   ```text
   unknown.organized
   -> privacy.review-assets-sanitized
   -> review.package-created
   -> user-controlled LMM review
   -> review.proposal-validated
   ```

   The privacy capability must receive a specific `unknown_cluster_ref`, not all prepared audio.

3. Add a deterministic `callweave.daily-close` capability/event. It is triggered by a timezone-aware host scheduler and emits one immutable `daily.closed` fact with coverage, quality, and the idempotency key `<location-id>:<local-date>`.

4. Make `daily-create` consume `daily.closed`, then query versioned observation/unknown/coverage facts for that bounded day. It must use the daily idempotency key and render exactly once; later corrections produce a separately versioned revision, never a silent replacement.

5. Treat model availability as a deterministic precondition checked from the host-owned model registry at classification invocation. Keep `model.availability-changed` for diagnostics/cache refresh only; remove it as a workflow dependency.

6. Add `coverage` as a first-class domain entity/event: recording minutes expected/captured/valid, source health, model availability, and quality distribution. The summary and canvas must display coverage state.

7. Define an evidence-retention policy capability or contract extension that records retention class, dependency/reference counts, legal/review hold, and earliest safe deletion date for every audio asset.

## Recommended delivery slices

### Slice A — make the graph safe

- Correct outcome routing and privacy order.
- Add daily-close, coverage, and exactly-once canvas semantics.
- Add an executable workflow definition only after these contracts/events are revised.

### Implemented contract/event remediation

- `detection-resolve` now emits distinct provisional, unknown, surprising, and rejected domain facts.
- `observation-manage` and `unknown-organize` consume only their permitted outcome facts.
- `privacy-protect` now consumes selected `unknown.organized` evidence; `review-prepare` consumes only the resulting `privacy.protected` fact.
- `acoustics-classify` no longer consumes model-availability changes; model availability remains a runtime precondition/diagnostic fact.
- Added `coverage-assess`, `evidence-retain`, and scheduler-driven `daily-close` capabilities.
- `daily-create` now consumes only `daily.closed`, whose idempotency key is location plus local date.

### Slice B — make the recorder trustworthy

- Decide PWA-only versus PWA plus local companion recorder from a real 24-hour capture test.
- Implement source health, clock, storage-pressure, and power-loss recovery tests.
- Establish retention/reference-count behavior before collecting valuable field data.

### Slice C — make identification measurable

- Produce a Golden pilot set with manual annotations.
- Version thresholds/model labels/candidate sets.
- Report precision-oriented review metrics, false-positive rate, unknown-cluster stability, and coverage.

### Slice D — grow safely

- Implement candidate-source refresh/reconciliation and taxonomic migration.
- Add ultrasonic hardware/model path only after audible P0 is stable.
- Add local model adaptation only after the verified, licensed evaluation baseline exists.

## Opportunities

- Use the daily coverage state artistically: silence, outage, rain, uncertainty, and high biodiversity can become visibly distinct instead of collapsing into one “empty” canvas.
- Preserve surprising detections as an exhibition layer: they invite human attention without asserting a fact.
- Build the generic location bootstrap as a reusable Traverse application bundle, not Golden setup code.
- Treat verified local embeddings as a privacy-preserving, location-owned acoustic memory that improves recall without uploading raw ambient recordings.
- Expose the trace alongside the artwork: every visual day can answer “what evidence and decisions shaped this?”

## Council release gate for the end-to-end workflow

Do not publish an active daily-monitoring workflow until the seven required pipeline revisions above are implemented, all route/close-of-day failure paths have executable fixtures, and a 24-hour recording pilot proves the selected runtime can meet the stated capture and retention policy.
