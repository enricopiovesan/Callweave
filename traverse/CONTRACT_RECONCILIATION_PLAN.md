# Contract reconciliation plan

**Last verified:** 2026-08-20

This file records the remaining app-level contracts that cannot be honestly
made executable by repeating the compatible-wrapper pattern. These require
contract/package reconciliation first.

## 1. `callweave.detection-resolve`

### Current state

- Draft app-level contract:
  `traverse/contracts/callweave/detection-resolve/contract.json`
- Existing pure package:
  `capabilities/detection.resolve/`

### Verified mismatch

The existing pure package and the app-level draft do not expose the same
surface.

Package surface today:

- input: `evidence`, optional `candidate`, `policy`
- output: `evidence_id`, `state`, `reason`, `policy_version`
- no trace, no workspace/location, no idempotency envelope, no emitted event id

App-level draft today:

- input: `request_id`, `workspace_id`, `location_id`, `idempotency_key`,
  `acoustic_evidence_ref`, `resolution_context`, `runtime_context`
- output: `status`, `reason_code`, `resolution_ref`, `resolution_state`,
  `emitted_event_id`, `trace_ref`, `warnings`

### Constraint

The app-level draft still declares `host_api_access: none`.

That means:

- it cannot rely on a host adapter to dereference `acoustic_evidence_ref`
- it cannot rely on a host adapter to append `resolution_ref`
- therefore its current ref-shaped input/output surface is not aligned with a
  truly pure executable package boundary

### Required decision

Pick one of these and make it explicit:

1. **Pure package alignment**
   - narrow the app-level contract until it matches a pure executable boundary
   - pass concrete evidence facts and policy facts directly
   - move record lookup and durable persistence into surrounding workflow/app
     orchestration

2. **Host-owned composition boundary**
   - keep the current ref-shaped app-level contract
   - change the contract to `host_api_access: exception_required`
   - define an explicit composition layer:
     - host resolves evidence/context refs
     - pure `detection.resolve` package evaluates policy
     - host appends durable result and emits governed event

### Recommended choice

Choice 2 is the cleaner fit for the current app-level contract, because the
existing draft already models a host-owned result record and emitted event.

That change should be made explicitly rather than implied.

## 2. `callweave.audio-prepare`

### Current state

- Draft app-level contract:
  `traverse/contracts/callweave/audio-prepare/contract.json`
- No corresponding executable package exists today

### Verified issue

The draft contract says:

- input uses `recording_ref`
- output uses `prepared_audio_ref`
- `host_api_access: none`

Those three facts conflict.

If the package is truly pure and has no host access:

- it cannot dereference `recording_ref`
- it cannot persist or allocate `prepared_audio_ref`

### Required decision

Pick one of these and make it explicit:

1. **Pure package boundary**
   - replace ref-shaped I/O with direct payload facts
   - example: PCM/windowing inputs and deterministic preparation outputs
   - host/workflow owns recording lookup and durable asset persistence

2. **Host-integrated app boundary**
   - keep `recording_ref` and `prepared_audio_ref`
   - change contract to `host_api_access: exception_required`
   - declare the host-owned recording/object-store boundary explicitly

### Recommended choice

Choice 2 is the better fit if this contract is intended to stay at the
Callweave app layer. Choice 1 is better only if the team wants a narrower
reusable pure package in addition to the app-level capability.

## 3. Practical next implementation order

1. Resolve `callweave.detection-resolve`
2. Resolve `callweave.audio-prepare`
3. After that, continue with the host-authority gaps:
   - `location-initialize`
   - `operations-recover`
   - `model-improve`
   - `review-prepare`
