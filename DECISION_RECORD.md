# Callweave — Product and Architecture Decision Record

**Status:** Living document  
**Last updated:** 2026-08-11  
**Initial deployment:** Golden, British Columbia, Canada  
**Product name:** Callweave  
**Tagline:** A living canvas for the sounds around us.

## 1. Vision

Callweave is a local-first wildlife sound system that records a place, identifies plausible animal vocalizations, preserves uncertainty, and turns each day into a visual artwork.

Golden is the first field deployment, not a special-case product. The same system must work for any address or coordinate by generating a location-specific candidate-species set.

### Governing principle

> Preserve raw evidence and uncertainty; automate classification, never truth.

An AI model produces evidence and confidence, not a verified fact. Static capabilities enforce data integrity and policy. An LMM is used only for advice on unknown sounds. A human approves durable knowledge changes.

## 2. Scope and non-goals

### In scope

- Continuous passive acoustic monitoring.
- Audible wildlife: birds, frogs/toads, many insects, and vocal mammals.
- Optional ultrasonic monitoring for bats and ultrasonic insects.
- Generic location setup and a seasonal, source-backed local candidate database.
- Local/WASM-first inference, storage, and visualization.
- Unknown-sound clustering and an LMM review package.
- An explainable daily art canvas.

### Explicit non-goals

- Claiming that every animal present can be identified by sound.
- Treating silent animals as acoustically detected.
- Allowing a model or LMM to silently update verified species knowledge.
- Using the Golden species list as hard-coded business logic.

## 3. Core architecture

```text
Location profile
  -> source-backed candidate set
  -> recording and analysis configuration
  -> local audio recording
  -> local model evidence
  -> deterministic plausibility and policy checks
  -> observation / unknown / surprising result
  -> daily ecological summary
  -> daily canvas
```

### Trust boundaries

```text
Static capabilities: validation, state transitions, database writes, provenance
Local AI/WASM: detection, classification, embeddings, clustering
LMM: advisory opinion only
Human reviewer: verifies durable knowledge and model releases
```

### Audio streams

| Stream | Baseline configuration | Supports |
|---|---|---|
| Audible | 48 kHz, 24-bit, mono, lossless FLAC master | Birds, amphibians, many insects, vocal mammals |
| Ultrasonic (optional) | 256 kHz or higher, separate source | Bats and ultrasonic insects |

The ordinary audible microphone cannot hear bat echolocation. No capability may claim bat coverage without a compatible ultrasonic source.

### File and analysis policy

- Capture lossless 15-minute master segments.
- Finalize each segment atomically with metadata and a checksum.
- Keep masters immutable; create disposable, model-specific derived windows.
- Use 3-second overlapping windows for BirdNET and 5-second windows for Perch or another model-specific requirement.
- Retain proof clips, spectrograms, results, and provenance longer than high-volume master audio.

At 48 kHz / 24-bit / mono, uncompressed audio is approximately 12.4 GB per day. FLAC is the preferred master format because it is lossless and normally substantially smaller; actual reduction varies with the soundscape. A retention policy must preserve the source recording long enough to reproduce every retained observation, unknown cluster, and review package.

### Browser-local runtime direction

The intended first runtime is a local-first PWA. Audio processing and model inference must run in workers so recording and the daily canvas stay responsive.

```text
PWA
├─ browser audio capture and local file ingestion
├─ lossless audio/spectrogram processing
├─ Web Workers for long-running work
├─ ONNX Runtime Web: WASM baseline, WebGPU acceleration when supported
├─ local model artifact cache
├─ IndexedDB or equivalent local persistent store
└─ optional local companion service for storage-heavy or constrained devices
```

The PWA must degrade safely: lack of WebGPU may reduce throughput but cannot change the interpretation policy; lack of a supported local model must result in `unavailable`, not a fabricated detection.

## 4. Location-aware wildlife knowledge

Each location has a private `LocationProfile` with coordinates, radius, timezone, elevation, habitat context, privacy settings, installed audio sources, and a candidate-set version.

The local candidate database is not a binary allow-list. Each species is one of:

```text
expected  -> normal analysis path
possible  -> eligible with moderate review weight
rare      -> eligible but review-weighted
surprising -> retained in quarantine for review
```

An impossible hardware claim is rejected. An out-of-range biological prediction is preserved as a surprising result with its evidence; it is not silently deleted.

Candidate records include common/scientific names, taxonomic identifiers and aliases, group, seasonal occurrence, local likelihood, supported acoustic band/model, provenance, and review status.

### Domain state and lifecycle

The durable domain entities are:

```text
LocationProfile, AudioSource, Recording, AudioWindow, AcousticEvidence,
Species, LocationCandidate, Observation, UnknownCluster, ReviewPackage,
ReviewProposal, ReferenceClip, ModelRegistry, DailyCanvas
```

Knowledge and sound interpretations use separate lifecycles:

```text
location knowledge: candidate -> proposed -> confirmed -> retired
sound interpretation: raw -> analyzed -> provisional -> verified / rejected / unknown / surprising
```

`confirmed` and `verified` require human approval. Every correction creates a superseding record; it must not rewrite history.

## 5. Identification approach

Callweave is not an exact music-fingerprint service. It borrows the useful Shazam shape—audio to compact features to matching/scoring—but identifies variable animal calls with classifiers, embeddings, geographic context, and human review.

```text
master recording
  -> biological-sound detection
  -> model-specific audio windows and spectrograms
  -> local classifier scores and embeddings
  -> range/season/habitat/hardware/quality score
  -> provisional observation, unknown cluster, or surprising quarantine
```

### Model roles

| Model role | Proposed implementation | Authority |
|---|---|---|
| Broad wildlife classification | Perch-compatible local model | Evidence only |
| Bird specialist | BirdNET-compatible local model | Evidence only |
| Bat specialist | Regional ultrasonic bat model | Evidence only |
| Local similarity / “animal Shazam” | Embeddings from verified local references | Evidence only |
| LMM | Review of sanitized unknown-sound packages | Proposal only |

Every result stores the recording ID, start/end time, model and version, input quality, candidate-set version, confidence, and evidence links.

### Local model and license notes

- BirdNET is a valuable bird specialist. Its analyzer source is MIT licensed, while current model weights are CC BY-NC-SA; any public/commercial direction requires a dedicated license review.
- Perch is the preferred broad bioacoustic foundation-model direction. Its open research code is Apache-2.0; record the license and distribution terms of each chosen model artifact independently.
- Bat classifiers must be regional and require compatible ultrasonic input. Model output is evidence only, not confirmation.
- Each downloaded model artifact needs a manifest, checksum, input contract, taxonomy/label version, license record, evaluation record, and activation state.

## 6. Unknown sounds and LMM review

Unknown sounds are a first-class result, not an error state.

1. Cluster locally similar unknown audio embeddings.
2. Select 3–5 clear representative clips per cluster.
3. Build a review package with audio, spectrograms, timestamps, weather/quality metadata, and nearby candidate context.
4. Sanitize the package: remove exact location and apply the human-speech/privacy policy before any external upload.
5. Ask an LMM for ranked taxon/species candidates and uncertainty in a strict machine-readable response.
6. Parse and validate the response against taxonomy, season, hardware capability, source provenance, and schema.
7. Create a proposed knowledge change only. A reviewer must approve it before it becomes confirmed knowledge or training data.

Example package:

```text
unknowns/2026-08-10.zip
├── README.md
├── manifest.json
├── known-context.json
├── cluster-001/
│   ├── representative.wav
│   ├── all-occurrences.csv
│   └── spectrogram.png
└── cluster-002/
```

The LMM must be permitted to answer `ignore`, `retain_unknown`, `add_location_candidate`, or `request_human_review`. It cannot mark a species verified.

## 6.1 Initial location bootstrap CLI and LMM skill

Callweave needs a repeatable setup workflow that initializes a new place without making Golden-specific assumptions. A future `initialize-wildlife-location` CLI/skill will:

```text
location input
-> resolve coordinates, privacy level, timezone, elevation, and radius
-> retrieve and normalize source-backed occurrence/taxonomy information
-> build a deterministic candidate-set draft
-> build an LMM habitat/context review package when useful
-> validate all LMM suggestions deterministically
-> write a versioned location profile, candidate set, source record, and app configuration
-> produce a human-readable initialization report
```

The LMM does not write configuration. The CLI is the only writer and accepts only schema-valid, source-backed, privacy-safe proposals.

Expected initialization artifacts:

```text
data/locations/<location-id>/
├── location-profile.json
├── candidate-species.json
├── sources.json
├── app-config.json
└── initialization-report.md
```

## 7. UMA / Traverse capability contract

Each atomic capability is independently replaceable and receives/returns a common envelope.

```json
{
  "capability": "RunAudioClassifier",
  "status": "success",
  "input_ids": ["audio-window-123"],
  "output_ids": ["acoustic-evidence-456"],
  "provenance": {
    "timestamp": "2026-08-10T18:30:00Z",
    "software_version": "…",
    "model_version": "…"
  },
  "confidence": 0.82,
  "next_actions": ["ScoreDetectionPlausibility"]
}
```

Every capability must be idempotent, auditable, version-aware, and safe to retry after interruption.

## 8. Capability map

### Location and source knowledge

- `ResolveLocation`
- `ClassifyLocationPrivacy`
- `DeriveHabitatContext`
- `DiscoverLocalSpecies`
- `NormalizeTaxonomy`
- `RecordDataSourceLicense`
- `BuildCandidateSet`
- `ConfigureLocationProfile`

### Audio configuration and capture

- `RegisterAudioSource`
- `ValidateHardwareCapability`
- `ConfigureRecordingProfile`
- `CalibrateMicrophone`
- `TestClockAccuracy`
- `CaptureAudio`
- `RotateRecordingFile`
- `FinalizeRecording`
- `ValidateRecording`
- `ApplyRetentionPolicy`

### Preparation and privacy

- `CreateAnalysisWindows`
- `ResampleForModel`
- `GenerateSpectrogram`
- `MeasureSoundscapeQuality`
- `ExtractAudioClip`
- `DetectHumanSpeech`
- `SanitizeReviewPackage`

### Local AI and model lifecycle

- `DetectBiologicalSound`
- `VerifyModelArtifact`
- `ManageModelDownloadCache`
- `RunPerchClassifier`
- `RunBirdNETClassifier`
- `RunBatClassifier`
- `CreateAudioEmbedding`
- `BuildVerifiedTrainingSet`
- `TrainLocalAdapter`
- `EvaluateCandidateModel`
- `PublishModelVersion`
- `RollbackModelVersion`

### Static interpretation and observations

- `ScoreDetectionPlausibility`
- `ApplyRangeSeasonFilter`
- `ApplyHardwareFilter`
- `CrossValidateModels`
- `AggregateRepeatedDetections`
- `QuarantineSurprisingDetection`
- `ResolveObservation`
- `CreateObservation`
- `AttachEvidence`
- `PromoteObservation`
- `CorrectObservation`
- `RejectObservation`

### Unknowns, LMM, and knowledge management

- `IdentifyUnknownEvidence`
- `ClusterUnknownSounds`
- `SelectRepresentativeClips`
- `CreateUnknownCluster`
- `MergeUnknownClusters`
- `SplitUnknownCluster`
- `BuildReviewPackage`
- `GenerateReviewPrompt`
- `ParseLMMResponse`
- `ValidateLMMProposal`
- `CreateKnowledgeProposal`
- `ApproveKnowledgeProposal`
- `UpdateLocationCandidate`
- `AddReferenceClip`
- `VersionCandidateDatabase`
- `RecordProvenance`

### Art and operations

- `BuildDailyEcologySummary`
- `MapEcologyToVisualParameters`
- `RenderDailyCanvas`
- `ArchiveDailyArtifact`
- `MonitorPipelineHealth`
- `RecoverInterruptedWorkflow`
- `BackfillAnalysis`
- `ReprocessRecording`
- `ExportData`
- `BackupLocalStore`

## 9. Principal business workflow

```text
Location profile
  -> candidate set
  -> audio capture and validation
  -> privacy/quality measurement
  -> local model inference
  -> static plausibility scoring
  -> credible observation OR unknown/surprising evidence
  -> unknown clustering and sanitized LMM package
  -> validated proposal and human approval
  -> versioned local knowledge
  -> daily ecology summary and canvas
```

## 10. Persona-based user-story standard

Every implementation capability must have a primary story in this format:

> As a `<persona>`, I want to be able to `<action>` so that `<outcome>`.

Every story needs happy and unhappy paths, preconditions, trigger, inputs, success criteria, failure states, emitted events, state transitions, and definition of done.

Primary personas:

- **Location Owner** — configures a place.
- **Field Operator** — installs and maintains hardware.
- **Reviewer** — evaluates uncertain evidence and proposals.
- **Artist** — uses the daily ecology data and canvas.
- **System Administrator** — manages models, storage, recovery, and exports.
- **System** — executes deterministic autonomous capabilities.

## 11. External-project review

No single open-source project implements the full Callweave design.

| Project | Useful overlap | Difference |
|---|---|---|
| BirdNET-Go | 24/7 self-hosted soundscape analysis; BirdNET, Perch, bats, local database, location filters | Server/Raspberry-Pi focus; no location-bootstrap/LMM-review/daily-art workflow |
| Acoupi | Modular edge recording, local inference, and data handling | Research/deployment framework rather than a generic ecology-art application |
| BirdNET Live | Local/offline inference and FLAC capture | Field/bird-focused application |
| iNaturalist sound-classifier extension | Browser-local ONNX analysis and geographic checks | Existing audio observations, not continuous capture and knowledge lifecycle |
| Perch | Broad bioacoustic foundation model and embeddings | Model/research toolkit, not an end-user workflow |

Callweave should use these as references and model sources, not fork one whole project. All model/data licenses must be recorded and reviewed before use.

### Research references

These links are research inputs, not endorsements or guarantees of fit. Re-check versions, model terms, and APIs when implementing.

- [BirdNET Analyzer](https://github.com/birdnet-team/BirdNET-Analyzer): scientific/batch audio processing and BirdNET model documentation.
- [BirdNET Python library](https://github.com/birdnet-team/birdnet): current library, models, embeddings, and geo-model support.
- [BirdNET-Go](https://github.com/tphakala/birdnet-go): closest self-hosted, multi-model continuous-monitoring reference.
- [Birda](https://github.com/tphakala/birda): command-line reference for BirdNET/Perch analysis and model-specific sample windows.
- [Perch](https://github.com/google-research/perch): bioacoustic foundation-model research and transfer-learning tooling.
- [Acoupi](https://github.com/acoupi/acoupi): modular edge acoustic monitoring/deployment reference.
- [BirdNET Live](https://birdnet-team.github.io/birdnet-live-app/): local/offline field-inference reference.
- [iNaturalist sound-classifier browser extension announcement](https://www.inaturalist.org/posts/129322-sound-classifier-browser-extension): relevant browser-local ONNX and geographic cross-checking approach.
- [BC Species & Ecosystems Explorer](https://a100.gov.bc.ca/pub/eswp/): useful provincial occurrence/status reference for a Golden bootstrap.
- [BC wildlife conservation information](https://www2.gov.bc.ca/gov/content/environment/plants-animals-ecosystems/wildlife): provincial wildlife context and conservation resources.

For a location bootstrap, occurrence sources may include source-approved data from iNaturalist, eBird, GBIF, and regional/provincial conservation authorities. The importer must retain source, query area/time, attribution, license/terms, and retrieval timestamp; it must not assume that observed occurrence equals current acoustic detectability.

## 12. Council evaluation

The design was reviewed using the LLM Council method: independent roles, cross-critique, and a single synthesis. The approach is inspired by [LLM Council](https://github.com/karpathy/llm-council), which collects independent model responses, anonymizes peer review, and synthesizes a final response.

### Outcome

The design is approved for a prototype with these binding conclusions:

1. Golden is configuration only; location logic must remain generic.
2. WASM/local inference is first choice; a local desktop/server fallback is required for constrained devices.
3. Local candidate data ranks and constrains results but does not discard surprising biological evidence.
4. A separate ultrasonic source is mandatory for reliable bat support.
5. LMM output is advisory and cannot mutate verified knowledge.
6. Raw evidence, provenance, model versions, and uncertainty are durable product data.
7. Automatic local model training is deferred until a verified, licensed dataset and held-out evaluation baseline exist.
8. The artwork must communicate uncertainty, recording quality, and unknown calls—not only confident species detections.

### Council criteria and personas

The decision review used the following perspectives. They remain useful as recurring review gates for future capability and model decisions.

| Persona | Review question |
|---|---|
| Bioacoustician | Does this correctly represent what can and cannot be inferred from a sound recording? |
| Local-first systems architect | Does this work offline, recover safely, and retain replaceable capability boundaries? |
| Wildlife-data steward | Does it preserve provenance, uncertainty, range-change evidence, and licensing obligations? |
| Privacy and safety reviewer | Does it protect precise location and incidental human audio before sharing? |
| Artist/product designer | Does the result turn ecology into meaningful art without concealing uncertainty? |
| Operations engineer | Is it versioned, observable, idempotent, retryable, and recoverable? |

No proposed capability, integration, or model release is ready until it passes the relevant perspectives.

## 13. Delivery sequence

### P0 — vertical slice

```text
Location profile
-> initial candidate set
-> audible recording ingestion
-> local Perch/BirdNET inference
-> static plausibility scoring
-> provisional / unknown / surprising states
-> daily summary
-> simple canvas
```

### P1 — trust and learning loop

```text
privacy/redaction
provenance/versioning
unknown clustering
LMM ZIP review
human approval
reprocessing/recovery
```

### P2 — expanded capability

```text
ultrasonic bat stream
verified local reference library
local adapter training
model evaluation/publishing/rollback
multi-location scaling
```

## 14. Open questions

1. Which hardware and power/network constraints define the first Golden deployment?
2. What data sources and licenses are acceptable for generating location candidate sets?
3. What human-speech/privacy policy applies to master recordings and external LMM packages?
4. What visual language should represent expected, uncertain, unknown, and surprising wildlife?
5. Which local runtime is preferred for the first prototype: browser PWA only, or PWA plus a local companion service?

## 15. Decision log

| ID | Decision | Status | Rationale |
|---|---|---|---|
| D-001 | Build a generic, location-profile-based product; deploy Golden first. | Accepted | Prevents Golden-specific logic and makes future locations configuration, not rewrites. |
| D-002 | Use local/WASM inference as the default execution path. | Accepted | Preserves privacy, offline use, and local ownership; provide a local companion fallback for constrained browsers. |
| D-003 | Use 48 kHz, 24-bit, mono, lossless audible masters in 15-minute segments. | Accepted | Matches primary models, retains useful acoustic detail, limits recovery loss, and supports re-analysis. |
| D-004 | Add ultrasonic monitoring as a separate optional source. | Accepted | A normal audible microphone cannot reliably detect bats. |
| D-005 | Keep master audio immutable and create model-specific derived windows. | Accepted | Makes evidence and future reprocessing reproducible. |
| D-006 | Use Perch as the broad local wildlife model and BirdNET as a bird specialist. | Accepted for prototype | Model outputs remain evidence only and must retain model/version/license provenance. |
| D-007 | Use a location candidate database with expected/possible/rare/surprising states. | Accepted | Avoids implausible suggestions without deleting potentially valuable rare evidence. |
| D-008 | Reject impossible hardware claims but quarantine out-of-range biological claims. | Accepted | A bat from an audible mic is invalid; an unexpected owl may be meaningful. |
| D-009 | Treat unknown sound as a durable, visible outcome. | Accepted | Honest uncertainty is both scientifically useful and artistically meaningful. |
| D-010 | Use embeddings to cluster unknown sounds and create a local similarity library. | Accepted | Reduces review burden and enables a future local “animal Shazam” layer. |
| D-011 | Use an LMM only to review sanitized unknown-sound packages. | Accepted | An LMM is useful for hypotheses but cannot be an authority over ecological truth. |
| D-012 | Prevent LMMs from writing verified database records or training data. | Accepted | All durable changes require deterministic validation and human approval. |
| D-013 | Preserve exact recording location privately and sanitize external review packages. | Accepted | Protects household privacy and reduces incidental human-speech exposure. |
| D-014 | Require provenance and versioning for recordings, candidate sets, models, outputs, and decisions. | Accepted | Enables audits, reprocessing, model comparison, and correction. |
| D-015 | Defer local fine-tuning until verified, licensed training data and a held-out evaluation set exist. | Accepted | Prevents feedback loops that train errors into local models. |
| D-016 | Render uncertainty, recording quality, and unknown activity in the daily canvas. | Accepted | The artwork must not turn uncertain predictions into false certainty. |
| D-017 | Use UMA/Traverse-style atomic capability contracts. | Accepted | Keeps static policy and replaceable model capabilities independently testable. |
| D-018 | Use open-source projects as references/components, not as a project to fork wholesale. | Accepted | Existing projects solve valuable subsets but not the full workflow or product intent. |

## Appendix A — Capability use-case catalogue

The following is the implementation-level user-story catalogue. Each capability must additionally declare its inputs, outputs, emitted events, idempotency key, provenance fields, and definition of done.

### A.1 Location and source knowledge

| Capability | User story | Happy path | Unhappy path |
|---|---|---|---|
| `ResolveLocation` | As a Location Owner, I want to provide an address or pin so that Callweave can create a private location profile. | A valid input resolves to coordinates, timezone, and a privacy-safe display name. | The input is ambiguous or fails to resolve; request a corrected pin and write no profile. |
| `ClassifyLocationPrivacy` | As a Location Owner, I want to choose how precisely a place is exposed so that recordings do not reveal my home location. | The system applies the selected public precision and stores exact coordinates privately. | A requested setting conflicts with sharing policy; disable external sharing until resolved. |
| `DeriveHabitatContext` | As a Location Owner, I want nearby habitat inferred so that candidate species reflect the real environment. | Forest, water, wetland, elevation, and urban context are recorded. | Data is unavailable; mark habitat unknown and lower related confidence. |
| `DiscoverLocalSpecies` | As a Location Owner, I want source-backed local species discovered so that the initial list is plausible. | Occurrences are retrieved for the radius, season, and available habitats. | A source fails; log it, keep successful sources, and label coverage incomplete. |
| `NormalizeTaxonomy` | As a System Administrator, I want species names normalized so that aliases never create duplicate animals. | Synonyms map to an accepted scientific/taxonomic identifier. | No reliable match exists; retain an unresolved record outside automatic detection. |
| `RecordDataSourceLicense` | As a System Administrator, I want source licenses recorded so that data is reused legally. | Each imported source has attribution, terms, and retrieval time. | Terms are unknown or disallow use; exclude the source from candidate generation. |
| `BuildCandidateSet` | As a Location Owner, I want expected, possible, rare, and surprising species states so that models are grounded without being silenced. | A versioned seasonal set is generated with provenance and scores. | Evidence is insufficient; create a draft requiring review rather than activate it. |
| `ConfigureLocationProfile` | As a Location Owner, I want a reusable profile so that the same app works at any location. | Coordinates, radius, timezone, privacy, hardware, and candidate version are saved. | Required information is missing; prevent activation and explain the missing fields. |

### A.2 Audio configuration and capture

| Capability | User story | Happy path | Unhappy path |
|---|---|---|---|
| `RegisterAudioSource` | As a Field Operator, I want to register a microphone so that audio is traceable to a device. | Store device identity, source type, channels, capability, and location profile. | The device is duplicate or unreadable; reject registration without altering configuration. |
| `ValidateHardwareCapability` | As a Field Operator, I want hardware checked so that unsupported animal groups are not analyzed. | Audible and ultrasonic capabilities enable only compatible models. | Sample rate/capability is insufficient; disable the affected model with an explanation. |
| `ConfigureRecordingProfile` | As a Field Operator, I want a recording profile so that quality and storage match my equipment. | A validated audible or ultrasonic profile is activated. | It exceeds device/storage limits; offer an explicit fallback and do not silently downgrade. |
| `CalibrateMicrophone` | As a Field Operator, I want a calibration test so that clipping and near-silence are found before deployment. | Test audio passes noise-floor, clipping, and input checks. | Wind, cable failure, silence, or clipping fails calibration and blocks activation. |
| `TestClockAccuracy` | As a Field Operator, I want the recorder clock checked so that detections align with time and season. | Clock offset is within tolerance and recorded. | Offset is too large or unknown; require synchronization before trusted analysis. |
| `CaptureAudio` | As a Field Operator, I want environmental audio captured so that wildlife can be analyzed. | The active source records continuously using its profile. | Input disappears; record an outage, retry safely, and preserve preceding audio. |
| `RotateRecordingFile` | As a System Administrator, I want fixed-size segments so that storage and recovery are manageable. | A new 15-minute segment begins with contiguous timestamps. | Rotation fails; preserve and finalize the partial file, then record the gap. |
| `FinalizeRecording` | As a System, I want files finalized atomically so that analysis never reads incomplete audio. | Metadata, checksum, and complete state are written before routing. | Checksum/metadata fails; quarantine the segment from analysis. |
| `ValidateRecording` | As a System Administrator, I want each recording validated so that bad audio cannot create observations. | Duration, format, clipping, and integrity pass. | Corrupt, silent, short, or incompatible audio is flagged with the exact reason. |
| `ApplyRetentionPolicy` | As a System Administrator, I want retention enforced so that storage remains healthy without losing evidence. | Expired masters are removed only after required proof assets/backups exist. | Preservation cannot be proven; skip deletion and alert the operator. |

### A.3 Preparation, privacy, and local inference

| Capability | User story | Happy path | Unhappy path |
|---|---|---|---|
| `CreateAnalysisWindows` | As a System, I want recordings split into valid windows so that every model receives usable input. | Timestamped overlapping windows are produced without modifying masters. | A corrupt range is isolated, logged, and skipped without losing the whole file. |
| `ResampleForModel` | As a System, I want model-specific audio derived so that each model receives its native format. | Valid derived audio is created for the requested model. | Conversion fails or source quality is too low; skip that model/window and retain master evidence. |
| `GenerateSpectrogram` | As a Reviewer, I want a spectrogram for retained evidence so that uncertain calls are inspectable. | A linked image is created for each detection/unknown representative. | Rendering fails; keep the audio and mark visual evidence unavailable. |
| `MeasureSoundscapeQuality` | As a Field Operator, I want noise/weather effects measured so that confidence reflects conditions. | Wind, rain, clipping, and noise floor create quality metadata. | The quality estimator is unavailable; apply conservative confidence penalties. |
| `ExtractAudioClip` | As a Reviewer, I want proof clips with context so that I can check a result quickly. | Export the event plus pre-roll and post-roll audio. | A file boundary is damaged; export the available range and flag incompleteness. |
| `DetectHumanSpeech` | As a Location Owner, I want likely human speech identified so that it can be protected before sharing. | Speech-risk segments are marked for redaction or exclusion. | The detector is unavailable/uncertain; external sharing is blocked or requires manual review. |
| `SanitizeReviewPackage` | As a Reviewer, I want review material sanitized so that LMM review does not expose private details. | Exact coordinates and blocked clips are excluded; manifest proves sanitization. | Privacy checks fail; package creation stops and identifies the unsafe asset. |
| `VerifyModelArtifact` | As a System Administrator, I want model files verified so that local inference uses known artifacts. | Hash, signature/manifest, license, and compatibility validate. | Artifact is corrupt, unlicensed, or incompatible; do not activate it. |
| `ManageModelDownloadCache` | As a System Administrator, I want local model caching so that the system works offline and avoids repeated downloads. | A versioned validated model is cached and reused. | Cache is incomplete/corrupt; invalidate it and retain the previous working version. |
| `DetectBiologicalSound` | As a System, I want probable biological sound detected so that classification focuses on useful audio. | Likely animal windows route to classifiers. | Low confidence routes to archival/unknown handling without asserting an animal. |
| `RunPerchClassifier` | As a Location Owner, I want a local broad-wildlife model so that more than birds are considered. | WASM/local inference returns ranked candidates and embeddings. | Model/runtime fails; record failure and use other supported local paths if available. |
| `RunBirdNETClassifier` | As a Location Owner, I want a bird specialist so that bird calls receive stronger evidence. | Valid audible windows return ranked bird probabilities. | Input/model is unavailable; omit specialist evidence without blocking other inference. |
| `RunBatClassifier` | As a Location Owner, I want a bat model when ultrasonic hardware exists so that bats are handled correctly. | Valid ultrasonic clips receive regional bat scores. | No compatible source exists; return `not_applicable`, never a bat absence claim. |
| `CreateAudioEmbedding` | As a System, I want reusable embeddings so that repeated and unknown calls can be compared locally. | Store a versioned embedding linked to source audio. | Generation fails; continue classification but skip similarity/cluster work. |

### A.4 Interpretation and observations

| Capability | User story | Happy path | Unhappy path |
|---|---|---|---|
| `ScoreDetectionPlausibility` | As a System, I want model scores combined with context so that claims are ecologically realistic. | Produce calibrated score from audio, quality, location, season, habitat, and model. | Missing context lowers confidence and prevents automatic promotion. |
| `ApplyRangeSeasonFilter` | As a Location Owner, I want location/season checks so that implausible suggestions are controlled. | Expected/possible/rare candidates remain eligible with appropriate weight. | Candidate set is unavailable; classify as unknown/surprising rather than accept. |
| `ApplyHardwareFilter` | As a Field Operator, I want source capability applied so that the system cannot hear unsupported bands. | Only source-compatible predictions proceed. | Source capability is unknown; withhold result pending configuration. |
| `CrossValidateModels` | As a Reviewer, I want model agreement shown so that corroborated detections are easier to trust. | Agreement increases confidence; disagreement creates a review signal. | Only one model ran; report single-model evidence transparently. |
| `AggregateRepeatedDetections` | As a System, I want repeated independent calls combined so that recurring activity is more credible. | Matching calls create a time-bounded occurrence episode. | Calls conflict in species/time; preserve separate episodes. |
| `QuarantineSurprisingDetection` | As a Reviewer, I want unexpected biological evidence retained so that rare events are not lost. | Preserve clip, result, and reason under the surprising state. | Evidence is non-biological or hardware-impossible; reject with audit reason. |
| `ResolveObservation` | As a System, I want each result placed in a safe state so that scores never become facts accidentally. | Assign provisional, unknown, surprising, ignored, or review-required state. | A transition violates policy; reject it and retain original evidence. |
| `CreateObservation` | As a System, I want traceable observations so that every retained claim has proof. | Link species hypothesis, scores, clip, source recording, and versions. | Evidence/provenance is incomplete; do not create a promotable observation. |
| `AttachEvidence` | As a Reviewer, I want all proof material attached so that observations can be audited. | Audio, spectrogram, model output, and source links are available. | Asset is missing; mark evidence incomplete and prevent verification. |
| `PromoteObservation` | As a Reviewer, I want to verify a provisional result so that trusted records improve the project. | Review approval changes it to verified with actor/time/reason. | Evidence is insufficient or wrong; reject or retain it as provisional. |
| `CorrectObservation` | As a Reviewer, I want to amend an identification so that a near miss can be repaired without losing history. | Create a superseding correction linked to original evidence. | Correction lacks evidence/taxonomic validation; keep original state and request review. |
| `RejectObservation` | As a Reviewer, I want false positives rejected so that they do not affect art or learning. | Preserve the rejected record and explanatory reason. | It is already verified/training-linked; require a corrective cascade rather than silent rejection. |

### A.5 Unknowns, LMM review, and knowledge lifecycle

| Capability | User story | Happy path | Unhappy path |
|---|---|---|---|
| `IdentifyUnknownEvidence` | As a System, I want uncertain biological clips classified as unknown so that the system does not guess. | Retain plausible unknown evidence for clustering. | Noise/non-biological audio is excluded or classified as environmental sound. |
| `ClusterUnknownSounds` | As a Reviewer, I want similar unknown calls grouped so that I review sound types instead of every clip. | Stable clusters are built from compatible versioned embeddings. | Too little/contradictory evidence exists; retain unclustered clips. |
| `SelectRepresentativeClips` | As a Reviewer, I want the clearest examples selected so that review has useful evidence. | Select high-quality and diverse examples with timestamps. | All clips are poor; package cluster as low quality and request more recordings. |
| `CreateUnknownCluster` | As a System, I want unknown clusters stored as records so that they recur across days. | Store stable ID, evidence, version, and lifecycle state. | Minimum evidence is not met; keep a transient grouping only. |
| `MergeUnknownClusters` | As a Reviewer, I want duplicate clusters merged so that one call type is not reviewed twice. | Preserve all evidence and create a merge audit trail. | Clusters use incompatible embeddings or conflict; leave them separate. |
| `SplitUnknownCluster` | As a Reviewer, I want mixed clusters split so that unrelated sounds are not given one diagnosis. | Create child clusters with evidence lineage. | Evidence cannot justify a split; retain cluster and mark ambiguity. |
| `BuildReviewPackage` | As a Reviewer, I want a daily ZIP so that an LMM receives complete unknown-sound context. | Package audio, spectrograms, metadata, candidate context, and manifest. | Required/safe asset is missing; mark incomplete and stop automatic submission. |
| `GenerateReviewPrompt` | As a Reviewer, I want a strict prompt so that an LMM returns parsable, uncertainty-aware advice. | Include permitted actions, schema, and no-verification rule. | Schema/template is unavailable; require manual review rather than submit an unstructured request. |
| `ParseLMMResponse` | As a System, I want LMM JSON parsed safely so that advice enters a controlled proposal flow. | Extract/store valid JSON alongside original response. | JSON is invalid/missing; retain text and route to manual interpretation. |
| `ValidateLMMProposal` | As a System, I want LMM advice checked so that hallucinations cannot alter knowledge. | Validate schema, taxonomy, locality, season, capability, and provenance. | Any validation fails; reject proposal with reasons and retain evidence. |
| `CreateKnowledgeProposal` | As a Reviewer, I want valid suggestions turned into proposals so that updates remain auditable. | Create proposed candidate/reference update with provenance. | A duplicate/conflicting proposal exists; link it instead of duplicating. |
| `ApproveKnowledgeProposal` | As a Reviewer, I want to approve proposals deliberately so that local knowledge becomes trustworthy. | Apply an approved versioned update with reviewer rationale. | Decline or expire the proposal; preserve its decision history. |
| `UpdateLocationCandidate` | As a Location Owner, I want verified local species added so that future analysis is better grounded. | Add source, season, status, and provenance to a new candidate-set version. | Change overwrites evidence/lacks provenance; refuse activation. |
| `AddReferenceClip` | As a Reviewer, I want verified local calls added as references so that local similarity improves. | Admit licensed, high-quality, verified evidence. | Clip is unverified, low-quality, or license-unknown; keep it out of reference data. |
| `VersionCandidateDatabase` | As a System Administrator, I want candidate changes versioned so that historical results are reproducible. | Publish immutable new version and activate it explicitly. | Version creation fails; retain current active version. |
| `RecordProvenance` | As a System Administrator, I want each decision traceable so that outcomes can be audited. | Store source, actor, inputs, versions, timestamps, and rationale. | Required field is absent; block downstream promotion/export. |

### A.6 Model learning, art, and operations

| Capability | User story | Happy path | Unhappy path |
|---|---|---|---|
| `BuildVerifiedTrainingSet` | As a System Administrator, I want only trusted audio exported for learning so that models do not learn errors. | Export verified, licensed, quality-approved labels and clips. | Unverified/conflicting data appears; fail validation and produce no dataset. |
| `TrainLocalAdapter` | As a System Administrator, I want a local adapter trained so that recurring local calls improve over time. | Train against versioned data and create a candidate model artifact. | Data/training fails; existing production model remains unchanged. |
| `EvaluateCandidateModel` | As a Reviewer, I want candidate models tested on held-out data so that claimed improvements are real. | Model passes pre-defined precision/recall/false-positive gates. | It regresses or evaluation is invalid; reject publication. |
| `PublishModelVersion` | As a System Administrator, I want approved models activated safely so that production changes are reversible. | Publish manifest, thresholds, evaluation, and checksummed artifact atomically. | Artifact/evaluation is incomplete; block activation. |
| `RollbackModelVersion` | As a System Administrator, I want to revert a bad model so that detection quality recovers quickly. | Reactivate prior approved version and record the cause. | No prior valid version exists; disable faulty model and alert the operator. |
| `BuildDailyEcologySummary` | As an Artist, I want a daily ecological summary so that the canvas is grounded in evidence. | Summarize verified/provisional activity, unknowns, quality, and weather. | Analysis is incomplete; publish explicit coverage/uncertainty rather than a false complete day. |
| `MapEcologyToVisualParameters` | As an Artist, I want ecology mapped to visual rules so that the art is explainable and consistent. | Species, time, confidence, abundance, and uncertainty map to documented parameters. | Data is missing; use a defined neutral/unknown visual treatment. |
| `RenderDailyCanvas` | As an Artist, I want the daily canvas rendered so that each day becomes a living artifact. | Generate a dated visual linked to its data/provenance. | Rendering fails; retain summary and make rendering retryable. |
| `ArchiveDailyArtifact` | As an Artist, I want daily canvases archived so that the project becomes a historical record. | Archive canvas, summary, and source-version links together. | Archive target fails; retain local pending artifact and alert. |
| `MonitorPipelineHealth` | As a System Administrator, I want health monitoring so that hardware, storage, and model failures are visible. | Report actionable status/alerts for sources and pipeline stages. | Monitoring fails; watchdog writes local diagnostics for later recovery. |
| `RecoverInterruptedWorkflow` | As a System Administrator, I want interrupted jobs recovered so that outages do not duplicate or lose work. | Resume idempotently from the last durable state. | State cannot be proven; quarantine affected work and request repair. |
| `BackfillAnalysis` | As a System Administrator, I want missed audio analyzed later so that outages do not create permanent blind spots. | Analyze valid archived audio with selected versions. | Audio is missing/corrupt; record an irrecoverable coverage gap. |
| `ReprocessRecording` | As a Reviewer, I want past audio rerun with new knowledge/models so that history benefits from improvements. | Store new versioned results beside prior results. | Evidence is unavailable; refuse reprocessing with audit reason. |
| `ExportData` | As a Location Owner, I want my data exported so that I retain control of it. | Create documented privacy-filtered export with provenance. | Target/permissions are invalid; produce no partial external export. |
| `BackupLocalStore` | As a System Administrator, I want verified backups so that the record survives device failure. | Create encrypted, checksummed, recoverable backup. | Verification fails; retain data and report backup failure. |
