# Contract reconciliation plan

**Last verified:** 2026-08-20

This file records the remaining app-level contracts that cannot be honestly
made executable by repeating the compatible-wrapper pattern. These require
contract/package reconciliation first.

## 1. `callweave.detection-resolve` — resolved on 2026-08-20

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

### Decision taken

Choice 2 was adopted.

- the app-level contract now explicitly models a host-owned composition
  boundary
- `host_api_access` is now `exception_required`
- a compatible Traverse bundle now exists at
  `apps/callweave-detection-resolve/`
- the bundle passes smoke, generate, validate, and register locally

### Why this was the correct choice

The app-level surface already modeled:

- ref-shaped inputs
- governed result refs
- emitted governed event ids
- trace/idempotency envelopes

That is an app boundary, not the lower-level reusable pure kernel boundary.

### Remaining note

The reusable `capabilities/detection.resolve/` package still exists as the pure
deterministic resolver kernel. The repo may later add an explicit checked-in
composition layer that maps the app-level inputs to that pure package at a
finer-grained implementation level, but the contract boundary itself is now
coherent.

## 2. `callweave.audio-prepare` — resolved on 2026-08-20

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

### Decision taken

Choice 2 was adopted.

- the app-level contract now explicitly models a host-owned composition
  boundary
- `host_api_access` is now `exception_required`
- a compatible Traverse bundle now exists at
  `apps/callweave-audio-prepare/`
- the bundle passes smoke, generate, validate, and register locally

### Why this was the correct choice

The app-level surface already modeled ref-based recording lookup and governed
prepared-audio outputs. That is an app boundary, not a narrower reusable pure
kernel boundary.

### Remaining note

The repo may still add a finer-grained pure preparation package later, but the
current app-level contract is now coherent and executable as a compatible
bundle.

## 3. Practical next implementation order

1. Continue with the host-authority gaps:
   - `location-initialize`
   - `operations-recover`
   - `model-improve`
   - `review-prepare`
