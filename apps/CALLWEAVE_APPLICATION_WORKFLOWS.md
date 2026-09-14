# Callweave application workflows

This is the user-facing composition layer shared by every Callweave client.
It deliberately names user intent, not Traverse capabilities. Each client
dispatches the same flow command and renders only returned state and events.
Target bindings are selected below this layer.

| User flow | User intent | Traverse workflow composition |
| --- | --- | --- |
| Set up a place | “Set up this place for listening.” | `location.initialize` → `core.validate-audio-source-profile` → `audio.calibration-plan-create` → `core.evaluate-schedule-trigger` |
| Listen | “Start listening” / “Stop listening.” | `audio.capture-request-plan` → `artifact.recording-finalize` → `record.transition-apply` |
| Process a recording | “Process the latest listening session.” | `core.create-audio-transform-plan` → `core.create-audio-window-plan` → `core.prepare-inference-request` → `inference.evidence-normalize` → `classification.outcome-resolve` → `embedding.cluster-organize` → `cluster.curate` |
| View a day | “Show me what happened today.” | `coverage.completeness-assess` → `period.finalize` → `summary.aggregate` → `uncertainty.score` → `visual.parameter-map` |
| Review findings | “Review this uncertain finding.” | `review.prepare` → `review.state-transition-decide` → `approval.decision-apply` → `revision.successor-assign` → `core.create-artifact-revision` |
| Keep Callweave healthy | “Maintain this place.” | `retention.eligibility-classify` → `operations.recover` → `classifier.release-gate-evaluate` → `model.improve` |

## Client boundary

- The **PWA** bundles a browser implementation of
  `traverse:platform/recording-host@0.1.0`.
- The **macOS app** bundles a macOS implementation of the same WIT interface.
- The recording, storage, and scheduling bindings are selected by the runtime;
  they are never exposed as app-to-app dependencies or user-facing controls.
- The UI sends a declared flow command and renders its returned state. It does
  not choose transitions, make a policy decision, or synthesize identifiers.

## Runtime requirement

The current Traverse `component-wit-v1` implementation validates and activates
the selected binding, but does not yet invoke it during an application command.
The flow composition above is therefore the application contract to register
now; executable end-to-end listening requires that runtime invocation step.
