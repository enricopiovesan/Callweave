# Callweave capability Registry completion plan

**Purpose:** keep every Callweave business capability generic, atomic,
configurable, state-aware, and reusable through Traverse.

This is a delivery checklist, not a workflow specification. UI, application
composition, and concrete platform adapters are intentionally out of scope.

## Governing rules

1. Capabilities contain business logic only. They never contain UI or
   presentation code.
2. Every capability may declare typed configuration and typed persisted state.
   Location profiles, candidate catalogs, thresholds, policies, model
   references, and defaults are configuration/state—not compiled Callweave
   assumptions.
3. Portable algorithms, policies, state transitions, and WASM AI models are
   Registry candidates.
4. Traverse supplies generic mediated contracts and runtime primitives.
   Concrete microphone, codec, database, filesystem, clock, GPU, and network
   adapters are host implementations of those contracts.
5. No capability may mention Callweave, Golden, wildlife, a vendor, a device,
   or a UI unless supplied as configuration or opaque data.

## Status legend

- **Published and integrated:** available from the public Traverse Registry
  and consumed by Callweave through an immutable `registry_ref`.
- **Registry-published:** present in the Registry source, but not yet verified
  as signed, indexed, and consumed by this app.
- **Extract:** generic logic exists locally or in a legacy Callweave contract;
  create a standalone contract, WASM component, fixtures, and Registry PR.
- **Design:** define the generic contract before implementation.
- **Runtime contract:** requires a generic Traverse connector/runtime contract;
  it is not a reason to keep business logic application-specific.
- **Application/host:** not a Registry capability; implement through app
  configuration, native UI, or a concrete host adapter.
- **Prototype:** a standalone implementation exists and runs locally, but
  quality review, Registry submission, or external evidence is incomplete.

## Current checkpoint (2026-09-16)

A read-only GitHub REST tree check against Registry `main` at
`fb6b4c5542fcc43749016b2e3f42b79e9e3196ac` found version `1.0.0` contracts
and persona `1.0.0` records for `audio-processing-consumer` and `event-steward`.
Signature siblings were present for seven of the nine capabilities; only
`audio.wav-pcm16-decode` and `model.activation-plan-create` were missing.
The wave-four handoff records all nine contracts as `lifecycle: draft` and
without qualified Rust/security implementation-review records. Thus merged
PRs are not equivalent to usable, active capabilities. Seven have signature
siblings; the two unsigned ones now have workflow-generated signatures in
[signature follow-up PR #527](https://github.com/traverse-framework/registry/pull/527).
That PR merged at `fb6b4c5542fcc43749016b2e3f42b79e9e3196ac` and adds only
those exact signing-workflow outputs. The latest public index is `index-v337`;
both entries have signatures but remain explicitly `draft`, so they are not
yet consumable active references.

The maintainer review and promotion questions are tracked in Registry
[issue #528](https://github.com/traverse-framework/registry/issues/528), with
the full request mirrored in
[`REGISTRY_MAINTAINER_REVIEW_REQUEST.md`](REGISTRY_MAINTAINER_REVIEW_REQUEST.md).
The repository maintainer's explicit approval of implementation/security
evidence is recorded in
[issue comment 5691652292](https://github.com/traverse-framework/registry/issues/528#issuecomment-5691652292);
the remaining action is the Registry-approved immutable lifecycle/version
operation.
The selected successor-version strategy and per-capability matrix are in
[`REGISTRY_SUCCESSOR_SUBMISSION_MATRIX.md`](REGISTRY_SUCCESSOR_SUBMISSION_MATRIX.md)
and were recorded in [issue comment 5691742370](https://github.com/traverse-framework/registry/issues/528#issuecomment-5691742370).

Registry signing workflow run
[#35034385910](https://github.com/traverse-framework/registry/actions/runs/35034385910)
successfully generated both signatures with the authorized key. The workflow-
dispatch path uploads signatures but does not commit them. The exact generated
outputs are now present on Registry `main` through
[PR #527](https://github.com/traverse-framework/registry/pull/527).

The current Traverse 0.20.0-based foundation `app validate` and fixture-backed
`app activate` commands both pass. The activation script supplies synthetic
artifact evidence, so this is not proof that the published Registry artifacts
were fetched or cryptographically activated. A real `registry sync` attempt
failed because the environment could not resolve `api.github.com`; retry after
network access returns.

The Traverse 0.10.2 runtime source exposes
`WasmExecutor::run_bytes_with_mediated_connectors`, and its connector ABI is
deny-by-default and bounds request/response envelopes to 64 KiB. A temporary
host-embedding harness executed `artifact.recording-finalize` successfully
with a mocked, version-authorized `traverse.object-store` connector. This
confirms that a custom embedding host can test the capability today. The CLI's
`capability-package execute` command uses the default runtime path and currently
has no connector-context argument, so that CLI command cannot provide this
test; shipping a generic CLI connector test host would be a separate Traverse
feature, not a requirement for a production host embedder.

An embedding-level test initially found that `artifact.recording-finalize`
truncated a valid `content_ref` containing escaped quotes. The implementation
was hardened to preserve validated quoted JSON tokens when constructing the
connector request, reject over-capacity input, and avoid references to mutable
statics. Rebuilding is warning-free, and both ordinary and escaped-quote
requests and a value containing embedded `"media_type":...` text all return
`created` through the mediated object-store mock; the mock confirmed the
original `content_ref` arrived intact. The executable now selects direct
top-level fields and rejects duplicate occurrences of the requested field.
This is still not a complete parser audit: malformed structure, duplicate
non-target fields, every JSON escape form, and the oversize boundary need
negative/edge fixtures plus qualified Rust/security review. It remains
prototype/not submission-ready. The separate local `record.transition-apply`
prototype was also hardened to scan only direct top-level members, reject
duplicate target keys, detect input over-capacity, and fail closed if any
connector-request field would overflow its bounded buffer. Its new nested-key
fixture confirms the root `idempotency_key` reaches the state-store mock rather
than a same-named nested transition field. Both ordinary and nested-key state
transition requests return the expected `appended` contract output. The parser
still needs malformed/all-escape/oversize-boundary fixtures and qualified
Rust/security review before any publication request.

Additional raw-request regressions now cover duplicate top-level `content_ref`
and duplicate top-level `idempotency_key` members. They remain raw JSON rather
than parsed host objects so duplicate-key rejection is exercised instead of
silently discarded by a host parser.

The rebuilt prototype artifacts are deterministic and warning-free:
`artifact.recording-finalize` SHA-256
`00dd873379cae551b81e58e428191bf73a3c87a8536318b3ae843f0e292a2f53` and
`record.transition-apply` SHA-256
`186a6a8f05fb346853296b5a23cfb16583efa720aba14e06599690962376abb1`.

The current Callweave foundation manifest contains no component references to
these nine capabilities. Registry policy makes published contracts immutable,
so do not edit the merged `1.0.0` contracts to change their lifecycle or
review evidence. First obtain the required qualified implementation review,
then confirm with Registry maintainers the correct additive versioning path to
publish a consumable, assurance-complete version. The local Registry checkout used by
`scripts/check_registry_publish_readiness.mjs` is on a September 10 catalog
branch, not current `main`; that script still labels all of these as publish
candidates and its “not ready” result is therefore not a valid publication
status report. Before another Registry submission, refresh the Registry view
and verify active index entries, signatures, and immutable refs; then wire the
capabilities that the daily workflow actually consumes into the foundation
components.

Local verification on 2026-09-15 passed: 14 pure-capability fixtures, the
business-logic smoke suite, six daily workflow fixtures, audio-evidence schema
validation (3 valid examples, 6 invalid examples, relational checks), all nine
wave-four WASM smoke suites, audio negative controls, local host/object/state
adapter smokes, scheduler smoke, and Traverse foundation validation after
refreshing the rebuilt WASM component digests. The sample inventory validates
four user-supplied files as unverified provenance; the planned corpus validates
29 taxa and nine negative controls; both long-form fixtures validate. These
are local fixture/test results, not Registry publication or qualified review.

Immediate order:

1. Obtain qualified Rust/security review for all nine LLM-assisted
   implementations, with source revision, artifact digest, tests, and review
   evidence recorded. Do not write an approval on the reviewer’s behalf.
2. Determine the immutability-safe publication path for versions currently
   frozen as draft.
   Signatures solve artifact authenticity metadata only; they do not supply
   the qualified implementation review or make draft contracts consumable.
3. Confirm active, signed index records; only then add exact-version
   `registry_ref`s for required wave-four operations to
   the app components, then run Traverse sync, validate, register, and
   activation checks.
4. Update readiness tooling to distinguish “already published” from “new
   submission candidate” and to inspect the current Registry index rather than
   treating a stale local checkout as authoritative.
5. Continue the remaining generic business-logic gaps listed below; do not
   submit duplicate versions of the nine merged capabilities.

## Capability checklist

| Capability | Status | Required action | Configuration/state | Runtime dependency |
|---|---|---|---|---|
| `location.initialize` | Published | Keep generic; move Golden data to location-profile configuration | Location identity, timezone, candidate-catalog refs; profile provenance | `state-store` for profile history |
| `core.validate-audio-source-profile` | Published | Pin Registry ref; retain local package only as extraction history | Sample rate, channels, format, limits, device metadata | None for policy; optional `audio-input` evidence |
| `audio.calibration-plan-create` | Published (Registry PR #369) | Pin the immutable Registry ref in the foundation manifest and add cross-domain integration fixtures | Target levels, tolerances, test duration, environment profile | `audio-input` supplies measurements |
| `core.create-audio-capture-request-plan` | Published | Pin Registry ref; add cross-domain fixtures | Duration, clock, channels, sample rate, format, segmentation | `audio-input`, scheduler, cancellation |
| `artifact.recording-finalize` | Prototype — escaped/nested-key regressions fixed and tested, not submission-ready | Complete malformed/duplicate-non-target/all-escape/oversize-boundary fixtures and parser audit; preserve successful host-injected connector tests; then qualified review and Registry process | Artifact metadata, checksums, retention class, provenance | `object-store`; embedding API works, CLI has no connector injection |
| `core.create-audio-transform-plan` | Published | Pin Registry ref; verify non-wildlife fixtures | Decode/resample/filter/feature configuration | `audio-codec` for execution |
| `core.create-audio-window-plan` | Published | Pin Registry ref; verify overlap and boundary cases | Window length, hop, alignment, timezone/clock policy | None for planning |
| `audio.pcm-transform` | Published (`1.1.1` in Registry) | Pin the immutable `1.1.1` ref and evaluate filter quality against audio corpus | Input/output rate, channels, bounded samples, filter policy | `audio-codec`/artifact stream supplies bounded PCM chunks |
| `audio.pcm-window` | Published (`1.1.1` in Registry) | Pin the immutable `1.1.1` ref and integrate a consumable exact ref | Window/hop duration, source offset, bounded sample limits | `audio-codec`/artifact stream supplies bounded PCM chunks |
| `audio.wav-pcm16-decode` | Published (`1.1.1` in Registry) | Pin the immutable `1.1.1` ref | Container bytes, accepted profile, resource limits | Artifact bytes from `object-store`; no host authority in decoder |
| `audio.container-decode` | Design | Define codec-neutral container/codec decode contract; compare portable WASM packages against a generic Traverse codec connector | Accepted codecs, sample format, channels, resource limits | Artifact bytes from `object-store`; optional codec runtime |
| `audio.privacy-risk-evaluate` | Published (`1.1.1` in Registry) | Pin the immutable `1.1.1` ref and integrate a consumable exact ref | Risk threshold, evidence completeness, configured allow/deny/review actions | VAD/privacy evidence supplied by model or human; no detector embedded |
| `artifact.shareability-classify` | Published (`1.1.1` in Registry) | Pin the immutable `1.1.1` ref and integrate a consumable exact ref | Audience and sensitivity allowlists, consent/sanitization requirements, policy version | Caller supplies metadata facts; no artifact bytes or export authority |
| `model.activation-plan-create` | Published (`1.1.1` in Registry) | Pin the immutable `1.1.1` ref | Allowed targets, maximum memory, unknown-evidence action | Trusted verifier/runtime supplies evidence; runtime independently enforces activation |
| `retention.action-plan-create` | Published (`1.1.1` in Registry) | Pin the immutable `1.1.1` ref and integrate a consumable exact ref | Archive/delete action, grace period, approval requirement, policy version | Host re-checks current eligibility/holds and invokes authorized storage connector; package has no storage access |
| `candidate.policy-evaluate` | Published (`1.1.1` in Registry) | Pin the immutable `1.1.1` ref and integrate a consumable exact ref | Accepted/excluded status sets, unlisted-status fallback, policy version | Caller supplies candidate facts; no catalog connector assumed |
| `event.append-plan-create` | Published (`1.1.1` in Registry) | Pin the immutable `1.1.1` ref; integration still needs generic `event-store` mediation | Event identity/type/schema, opaque payload and aggregate refs, causality, idempotency | `traverse.event-store` owns durable append/replay |
| `core.prepare-inference-request` | Published | Pin Registry ref; keep model identity opaque/configured | Model digest, input schema, label schema, resource budget | `local-model-runtime` |
| `inference.evidence-normalize` | Published (1.0.1) | Verify active signed index record and keep the exact `1.0.1` ref pinned in the foundation component | Units, timestamps, provenance, confidence policy | `state-store` for evidence references |
| `classification.outcome-resolve` | Published | Keep candidate resolution taxonomy-neutral | Candidate catalog, evidence weights, confidence thresholds | None; model evidence is input |
| `uncertainty.score` | Published | Keep evidence-bound and reason-coded | Coverage, confidence, pending refs, score thresholds | None |
| `record.transition-apply` | Prototype — top-level/nested-key regressions fixed and tested, not submission-ready | Complete malformed/all-escape/oversize-boundary/version-overflow fixtures and parser audit; preserve host-injected connector tests; then qualified review and Registry process | State schema, transition rules, idempotency key | Traverse-mediated `state-store`; embedding API exists, CLI has no connector injection |
| `embedding.cluster-organize` | Published | Keep clustering domain-neutral | Distance metric, cluster thresholds, representative policy | Embedding model/runtime |
| `cluster.curate` | Published | Keep merge/split/label actions taxonomy-neutral | Reviewer policy, cluster constraints | `state-store` |
| `review.prepare` | Published | Keep review bundle schema generic | Evidence selection, redaction, reviewer role | `object-store`, optional advisory connector |
| `review.state-transition-decide` | Published | Keep reviewer decisions generic | Allowed transitions, authority, reason codes | `state-store` |
| `approval.decision-apply` | Published | Keep approval semantics reusable | Approval roles, quorum, expiry, reason codes | `state-store` |
| `knowledge-manage` composition | Extract | Compose records, revisions, approvals; do not publish a Callweave contract | Knowledge schema, promotion policy, provenance | `state-store`, `event-store` |
| `model.artifact-verify` | Traverse/runtime contract gap | Define a generic bounded streaming digest/signature verification interface and trust-root policy before implementation; never treat caller-supplied booleans as proof | Artifact reference, expected digest, signature/key policy, licence metadata and explicit acceptance | Requires Traverse-mediated artifact streaming/crypto verification; no model artifact selected |
| WASM model capabilities (classifier/embedding/VAD/etc.) | Design | Select an explicitly licensed artifact and publish each stable model interface | Model config, labels, thresholds, resource budget | Traverse WASM/runtime execution |
| `classifier.release-gate-evaluate` | Published | Keep evaluation/release policy model-neutral | Metrics, held-out policy, regression thresholds | `training-runner` supplies results |
| `summary.aggregate` | Published | Keep aggregation independent of visual output | Period, included/pending refs, aggregation rules | `state-store` reads |
| `visual.parameter-map` | Published | Produce renderer-neutral parameters only | Mapping palette/range/style parameters | Native renderer consumes output |
| `core.create-artifact-revision` | Published | Pin Registry ref; preserve immutable lineage | Parent digest, revision metadata, authoring reason | `object-store` persists artifact |
| `revision.successor-assign` | Published | Keep successor semantics generic | Lineage policy, supersession reason | `state-store` |
| `period.finalize` | Published | Keep period closure generic | Period boundary, timezone, completeness policy | Scheduler supplies wake-up context |
| `core.evaluate-schedule-trigger` | Published | Pin Registry ref; keep recurrence configurable | Recurrence, timezone, retry/cancellation policy | Traverse scheduler |
| `retention.eligibility-classify` | Published | Keep retention decision policy generic | Retention class, legal/consent policy, age, evidence status | `state-store` reads |
| `operations.recover` | Published | Keep recovery/replay policy generic | Backup manifest, replay range, verification rules | Host backup and storage services |

## Generic Traverse contracts required

These are runtime/authority contracts, not Callweave capabilities. They must
be generic enough to support macOS, browser, Linux, embedded, and future
hosts:

- `traverse.audio-input`: permission-mediated device discovery and byte stream;
- `traverse.audio-codec`: decode, encode, resample, and DSP execution;
- `traverse.state-store`: versioned capability configuration and state;
- `traverse.object-store`: immutable/bounded binary artifacts;
- `traverse.event-store`: append-only events and causal references;
- `traverse.scheduler`: wake-up, retry, cancellation, and clock mediation;
- `traverse.local-model-runtime`: execute a declared WASM/model capability;
- `traverse.model-artifact-store`: retrieve, cache, verify, and activate model
  artifacts;
- `traverse.advisory-review`: mediated external review request/response;
- `traverse.training-runner`: execute training/evaluation jobs and return
  evidence, without embedding training policy in the host.

## Execution sequence

### Phase 1 — Registry alignment

- Pin all currently published Registry references in the foundation manifest.
- Re-sync the Registry and verify namespace, version, digest, signature, and
  artifact for every reference.
- Remove or clearly mark superseded `callweave.*` contracts as extraction
  history.

### Phase 2 — Finish generic pure capabilities

Complete and publish the remaining generic atomic operations: recording
finalization, a codec-neutral container-decoding contract (only if it adds
formats beyond the published WAV decoder), and any additional evidence
normalization or state-transition behavior that cannot be covered by the
already published contracts. Define the model-artifact verification boundary
with Traverse before implementing it. Do not resubmit the nine wave-four
capabilities already present in Registry `main`. Each genuinely new Registry
capability must include:

- standalone contract and configuration schema;
- portable WASM implementation where applicable;
- happy/unhappy JSON fixtures;
- idempotency, versioning, and state ownership rules;
- registry submission, review, and publication evidence.

### Phase 3 — Model capability decision

For every proposed WASM model, record the artifact URL/digest, licence,
redistribution rights, model ABI, labels, memory/CPU limits, and deterministic
fixture set. Do not select or download an artifact until this decision is
explicitly approved.

The evaluation must score candidates separately for (a) broad bioacoustic
coverage beyond birds, (b) calibrated unknown/abstain behavior, (c) WASM-
portable inference, (d) memory and latency at the target envelope, (e) label
taxonomy/configurability, and (f) licence and redistribution clarity. A model
that is excellent for birds but cannot represent mammals, insects, amphibians,
or environmental sounds is not sufficient for Callweave's generic animal-sound
use case. The output of this phase is a comparison record and an explicit
approval—not an implicit download.

### Phase 4 — Traverse runtime integration

- Register the generic connector contracts above in Traverse.
- Implement registry-reference resolution during activation.
- Validate application connector bindings and host activation candidates.
- Exercise stateful `record.transition-apply` through the mediated state API.
- Verify offline activation from a previously synced, signed Registry cache.

### Phase 5 — Multi-target adapters

Bind the same capabilities and configuration to macOS, browser, and future
hosts. Implement native UI and concrete adapters without forking capability
logic. Run the same fixture suite against every target.

## Definition of done

The Callweave business-logic migration is complete when:

1. Every business capability above is published or has an approved extraction
   issue with a named owner and acceptance fixtures.
2. No reusable behavior remains under a Callweave-specific capability ID.
3. Location, candidate catalogs, policies, thresholds, and models are
   configuration/state, not source-level assumptions.
4. All stateful capabilities use generic Traverse state/event/object contracts.
5. WASM model capabilities have explicit artifact and licence decisions.
6. Runtime/connector implementations can vary by target without changing
   capability contracts.
7. The identical business-logic fixture suite passes on macOS and web.
