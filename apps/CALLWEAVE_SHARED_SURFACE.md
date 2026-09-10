# Callweave shared Traverse surface

This is the canonical, generated inventory of the domain capabilities and one-node workflows that Callweave applications share. Its source is `apps/callweave-foundation/app.manifest.json`.

Every Callweave interface delegates domain work to this Traverse capability/workflow surface. Interfaces may expose a subset of routes, but may not duplicate business logic.

A UI sends commands, renders state and results, and delegates device-specific work to its native host.

The catalogue currently contains **28** capability/workflow pairs. “local_contract_pending_registry_sync” means the Foundation contract exists locally but was not present in the most recently synced public Registry index when this file was generated.

## 1. `approval.decision-apply`

Workflow: `callweave.foundation.approval.decision-apply` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Apply a human decision to a proposal without performing version successor logic.

Use cases:
  - As an approval consumer, I want an approve decision to return an applied result so that a separate successor-assignment step can proceed.
  - As an approval consumer, I want a deny decision to remain non-applied so that advisory suggestions cannot mutate durable state without approval.

## 2. `artifact.recording-finalize`

Workflow: `callweave.foundation.artifact.recording-finalize` v1.0.0  
Registry status: local_contract_pending_registry_sync  
Targets: local, device, edge, cloud

Finalize captured recording bytes as an immutable artifact through a declared object-store connector.

Use cases:
  - As an artifact operator, I want captured audio finalized once as an immutable asset so that later processing refers to verified content.
  - As an artifact operator, I want an idempotent replay reported so that a retry does not duplicate a recording artifact.
  - As an artifact operator, I want unavailable storage represented without a path, credential, or provider detail so that host internals stay private.

## 3. `classification.outcome-resolve`

Workflow: `callweave.foundation.classification.outcome-resolve` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Resolve supplied scored evidence into one governed classification outcome.

Use cases:
  - As a classification consumer, I want expected scored evidence above policy threshold marked provisional so that downstream review can consider it.
  - As a classification consumer, I want rare scored evidence above policy threshold quarantined as surprising so that unusual high-confidence cases are reviewed instead of silently promoted.
  - As a classification consumer, I want unscored evidence kept unknown so that raw candidate claims never become governed outcomes.
  - As a classification consumer, I want incompatible evidence rejected so that impossible claims cannot enter downstream review.
  - As a classification consumer, I want absent candidates kept unknown so that out-of-scope labels are not promoted into governed outcomes.

## 4. `classifier.release-gate-evaluate`

Workflow: `callweave.foundation.classifier.release-gate-evaluate` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Evaluate a classifier release gate from labeled outcomes.

Use cases:
  - As a classifier steward, I want a candidate with sufficient labeled positive-case coverage and zero false negatives approved so that a separate host can rely on that policy gate.
  - As a classifier steward, I want a candidate with missed positive cases rejected so that unsafe classifier behavior cannot be promoted.
  - As a classifier steward, I want insufficient positive-case coverage rejected so that approval cannot be claimed from weak evaluation data.

## 5. `cluster.curate`

Workflow: `callweave.foundation.cluster.curate` v1.0.0  
Registry status: public_registry  
Targets: local

Curate a supplied cluster deterministically.

Use cases:
  - As a cluster reviewer, I want a proposed cluster preserved with its supplied representative so that downstream systems can consume a stable curated grouping.

## 6. `coverage.completeness-assess`

Workflow: `callweave.foundation.coverage.completeness-assess` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Assess the completeness of supplied coverage facts.

Use cases:
  - As a coverage consumer, I want fully captured and processed healthy coverage marked complete so that I can trust the completeness boundary.
  - As a coverage consumer, I want incomplete but healthy coverage marked partial so that reduced completeness is not confused with full availability.
  - As a coverage consumer, I want an unhealthy source marked unavailable so that source failure is not interpreted as complete coverage.
  - As a coverage consumer, I want an invalid expected duration marked unavailable so that completeness is never invented from an empty scope.

## 7. `embedding.cluster-organize`

Workflow: `callweave.foundation.embedding.cluster-organize` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Cluster supplied embeddings into stable local groups.

Use cases:
  - As a cluster reviewer, I want similar embedded items grouped together so that I can inspect one local cluster instead of isolated items.

## 8. `location.initialize`

Workflow: `callweave.foundation.location.initialize` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Normalize supplied occurrence facts into a deterministic location candidate set.

Use cases:
  - As a location owner, I want supplied occurrence facts normalized into a stable candidate set so that downstream detection policy starts from deterministic inputs.
  - As a location owner, I want malformed occurrence facts rejected so that a candidate set is never synthesized from incomplete records.

## 9. `model.improve`

Workflow: `callweave.foundation.model.improve` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Evaluate a verified model candidate against deterministic release thresholds.

Use cases:
  - As a system administrator, I want a verified candidate that passes held-out precision and recall thresholds approved so that a local release can be activated separately.
  - As a system administrator, I want an unverified artifact rejected before evaluation thresholds matter so that unchecked model files cannot be promoted.
  - As a system administrator, I want a verified candidate below recall threshold rejected so that weak evaluations do not silently replace a known-good model.
  - As a system administrator, I want an explicitly rejected candidate blocked from release so that previously failed artifacts cannot be republished through the release gate.

## 10. `operations.recover`

Workflow: `callweave.foundation.operations.recover` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Plan which idempotent operations still need replay.

Use cases:
  - As an operator, I want only missing idempotent operations replayed so that restart recovery does not duplicate successful work.
  - As an operator, I want a no-op recovery result when all expected work has already completed so that replay stays bounded and deterministic.

## 11. `period.finalize`

Workflow: `callweave.foundation.period.finalize` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Create a deterministic finalized period record from supplied scope facts.

Use cases:
  - As a period operator, I want one deterministic finalized record for a bounded period so that downstream work executes exactly once per scope, period, and watermark key.
  - As a period operator, I want empty included and pending references normalized consistently so that an empty period is still finalized deterministically.

## 12. `record.transition-apply`

Workflow: `callweave.foundation.record.transition-apply` v1.0.0  
Registry status: local_contract_pending_registry_sync  
Targets: local, device, edge, cloud

Apply an idempotent transition to a versioned record through a declared state-store connector.

Use cases:
  - As a record operator, I want an accepted transition appended exactly once so that a retry does not create a second history entry.
  - As a record operator, I want an idempotent replay reported without another state change so that recovery is safe.
  - As a record operator, I want an unavailable connector represented by a stable non-secret result so that host details are never exposed.

## 13. `retention.eligibility-classify`

Workflow: `callweave.foundation.retention.eligibility-classify` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Classify asset retention eligibility from supplied dependency and hold facts.

Use cases:
  - As a retention steward, I want legal-held assets classified as held so that downstream systems never treat them as eligible for removal.
  - As a retention steward, I want referenced assets classified as retained so that active dependencies preserve them.
  - As a retention steward, I want unreferenced assets marked eligible rather than deleted so that removal remains a separate downstream decision.
  - As a retention steward, I want review-held assets classified as held so that review protection has the same precedence as a legal hold.

## 14. `review.prepare`

Workflow: `callweave.foundation.review.prepare` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Permit advisory review assets only when a supplied privacy decision is already protected.

Use cases:
  - As a reviewer, I want a privacy-protected unknown cluster to expose only sanitized assets so that optional external advisory review stays bounded.
  - As a reviewer, I want an unprotected cluster blocked from review preparation so that uncertain privacy status fails closed.
  - As a reviewer, I want a policy-blocked cluster prevented from review preparation so that explicitly denied privacy outcomes cannot be shared externally.

## 15. `review.state-transition-decide`

Workflow: `callweave.foundation.review.state-transition-decide` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Decide the next reviewed state from the current state and reviewer decision.

Use cases:
  - As a review consumer, I want a provisional item verified only when the reviewer explicitly verifies it so that final acceptance remains governed.
  - As a review consumer, I want a non-provisional item blocked from verification so that uncertain or rejected items cannot become verified by mistake.
  - As a review consumer, I want a reject decision to produce a rejected state so that negative review outcomes remain explicit and traceable.
  - As a review consumer, I want a provisional decision to preserve a provisional state so that a reviewer can keep an item in bounded limbo without falsely rejecting it.
  - As a review consumer, I want an already rejected item to remain rejected when the reviewer confirms rejection so that terminal negative outcomes stay explicit.

## 16. `revision.successor-assign`

Workflow: `callweave.foundation.revision.successor-assign` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Assign the next append-only revision number for a subject.

Use cases:
  - As a revision consumer, I want a subject with an existing revision to receive the next append-only successor revision so that history remains strictly ordered.
  - As a revision consumer, I want a subject with no prior revision to receive revision one so that creation and supersession share the same primitive.

## 17. `summary.aggregate`

Workflow: `callweave.foundation.summary.aggregate` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Aggregate bounded-scope references into a deterministic summary record.

Use cases:
  - As a summary consumer, I want included and pending references counted deterministically so that later policies can consume a stable aggregate without re-reading the original reference lists.
  - As a summary consumer, I want an empty period summarized explicitly so that downstream scoring can distinguish zero evidence from missing input handling.

## 18. `uncertainty.score`

Workflow: `callweave.foundation.uncertainty.score` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Score uncertainty deterministically from aggregate counts and coverage state.

Use cases:
  - As an uncertainty consumer, I want non-zero pending counts reflected in the uncertainty score so that downstream visual or review logic can preserve unresolved signal.
  - As an uncertainty consumer, I want an empty period to surface full uncertainty so that zero included and zero pending counts are never misread as certainty.

## 19. `visual.parameter-map`

Workflow: `callweave.foundation.visual.parameter-map` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Derive deterministic visual parameters from summary facts and a style policy.

Use cases:
  - As a visual composer, I want stable visual parameters derived from daily summary facts so that repeated runs produce the same composition inputs.
  - As a visual composer, I want higher uncertainty to surface a visibly stronger treatment so that the composition remains honest about ambiguity.

## 20. `inference.evidence-normalize`

Workflow: `callweave.foundation.inference.evidence-normalize` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Normalize opaque inference detections into deterministic evidence records.

Use cases:
  - As an evidence consumer, I want detections sorted by capture time and given stable evidence identifiers so that downstream policies can compare results across targets.
  - As an evidence consumer, I want malformed confidence or intervals rejected before persistence so that invalid model output cannot enter the evidence store.

## 21. `core.prepare-inference-request`

Workflow: `callweave.foundation.core.prepare-inference-request` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Create a connector-neutral local inference request from opaque artifact references.

Use cases:
  - As an inference operator, I want a complete bounded request plan so that a configured local runtime can execute it later.
  - As an inference operator, I want each required opaque reference checked so that incomplete requests never reach a model runtime.

## 22. `core.evaluate-schedule-trigger`

Workflow: `callweave.foundation.core.evaluate-schedule-trigger` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Evaluate declared trigger context into a connector-neutral scheduling plan.

Use cases:
  - As an operations operator, I want a due trigger turned into a portable scheduler plan so that a compatible host may execute it.
  - As an operations operator, I want a not-due trigger represented without scheduling anything so that duplicate work is avoided.
  - As an operations operator, I want missing trigger context rejected before a scheduler is invoked, so that no ambiguous timer request is created.

## 23. `core.create-artifact-revision`

Workflow: `callweave.foundation.core.create-artifact-revision` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Create immutable successor metadata for a corrected artifact.

Use cases:
  - As an artifact operator, I want a correction to create the next immutable revision so that prior revisions remain preserved.
  - As an artifact operator, I want incomplete revision facts rejected so that no ambiguous successor is created.

## 24. `core.create-audio-capture-request-plan`

Workflow: `callweave.foundation.core.create-audio-capture-request-plan` v1.0.0  
Registry status: public_registry  
Targets: local, edge, device

Create a deterministic bounded audio capture request plan.

Use cases:
  - As an audio operator, I want a valid bounded segment represented as a portable plan, so that a compatible host may later execute it.
  - As an audio operator, I want the one-hour maximum enforced, so that capture resource limits remain portable.
  - As an audio operator, I want missing identifiers rejected, so that a host is never asked to infer capture intent from ambient state.
  - As an audio operator, I want fractional duration rejected, so that plans remain integer and reproducible.

## 25. `audio.calibration-plan-create`

Workflow: `callweave.foundation.audio.calibration-plan-create` v1.0.0  
Registry status: public_registry  
Targets: local, browser, edge, device

Create a bounded, connector-neutral audio calibration plan.

Use cases:
  - As an audio operator, I want a valid calibration policy represented as a portable plan so that a compatible audio-input host can measure it.
  - As an audio operator, I want an unsafe target rejected before a host is invoked so that calibration remains bounded.

## 26. `core.validate-audio-source-profile`

Workflow: `callweave.foundation.core.validate-audio-source-profile` v1.0.0  
Registry status: public_registry  
Targets: local, edge, device

Validate a portable audio-source profile against a bounded capture policy.

Use cases:
  - As an audio operator, I want a supported PCM profile accepted, so that a host can safely receive a later capture request.
  - As an audio operator, I want unsupported channel counts rejected, so that a host is not asked for an out-of-policy capture.
  - As an audio operator, I want unsupported sample rates rejected, so that capture resource limits remain explicit and portable.
  - As an audio operator, I want unsupported bit depths rejected, so that a downstream transformation is never planned from an ambiguous format.
  - As an audio operator, I want an incompatible PCM encoding rejected, so that source format compatibility is verified before any host work begins.
  - As an audio operator, I want an overlong requested segment rejected, so that the capture limit is enforced before a host is asked to act.
  - As an audio operator, I want incomplete policy input rejected with a stable result, so that malformed requests do not reach an audio host.

## 27. `core.create-audio-transform-plan`

Workflow: `callweave.foundation.core.create-audio-transform-plan` v1.0.0  
Registry status: public_registry  
Targets: local, edge, device

Create a deterministic, connector-neutral audio transformation plan.

Use cases:
  - As an audio operator, I want a valid target PCM format represented as a portable plan, so that a compatible codec host can execute it.
  - As an audio operator, I want 24-bit PCM accepted, so that a supported target encoding can be planned.
  - As an audio operator, I want 32-bit float PCM accepted, so that a supported target encoding can be planned deterministically.
  - As an audio operator, I want an unsupported target rate rejected before a codec host is invoked, so that resource requirements remain bounded.
  - As an audio operator, I want an unsupported channel count rejected, so that a host receives only bounded target geometry.
  - As an audio operator, I want an unsupported target encoding rejected, so that the codec contract stays explicit.
  - As an audio operator, I want missing opaque identifiers rejected, so that no host operation is invented from ambient state.

## 28. `core.create-audio-window-plan`

Workflow: `callweave.foundation.core.create-audio-window-plan` v1.0.0  
Registry status: public_registry  
Targets: local, edge, device

Create a deterministic bounded-window plan for a declared-duration audio artifact.

Use cases:
  - As an audio operator, I want a declared duration split into deterministic overlapping windows, so that a downstream worker receives bounded work units.
  - As an audio operator, I want a short artifact to produce one window, so that every positive declared duration has a bounded plan.
  - As an audio operator, I want a hop longer than its window rejected, so that no invalid overlap geometry is sent downstream.
  - As an audio operator, I want zero or missing geometry rejected, so that malformed policies do not create a plan.
  - As an audio operator, I want a missing duration rejected with a stable response, so that hosts do not infer a duration from artifact bytes.
  - As an audio operator, I want a fractional duration rejected, so that window counts remain integer and reproducible.

