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

