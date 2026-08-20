# Remaining executable gaps

**Last verified:** 2026-08-20

This file records the remaining Callweave app-level contracts that are not yet
honestly executable through the checked-in Traverse bundles.

## 1. `callweave.audio-prepare`

Current state:

- Draft app-level contract exists at
  `traverse/contracts/callweave/audio-prepare/contract.json`.
- The contract declares `host_api_access: none`.
- No checked-in executable package exists for this app-level contract.

What this means:

- This should not be implemented as another compatible host wrapper.
- It needs either:
  - a dedicated pure package for the app-level contract, or
  - an explicit approved composition over existing lower-level pure packages.

## 2. `callweave.detection-resolve`

Current state:

- Draft app-level contract exists at
  `traverse/contracts/callweave/detection-resolve/contract.json`.
- A reusable pure package exists at `capabilities/detection.resolve/`.
- The two contracts are not the same surface.

What this means:

- The existing pure package cannot be silently reused as the app-level
  executable implementation.
- The repo needs one of:
  - contract alignment between the app-level and package-level surfaces, or
  - a thin, explicit app-level composition layer that maps one contract to the
    other with checked-in rules and evidence.

## 3. `callweave.location-initialize`

Current state:

- Pure logic exists.
- The app-level surface needs source-backed import and private persistence.
- The checked-in local host-adapter document does not yet declare that source
  or network authority.

What this means:

- Not blocked by Traverse packaging mechanics.
- Blocked by missing declared host authority in this repo.

## 4. `callweave.operations-recover`

Current state:

- Pure logic exists.
- The app-level surface includes export, backup, and recovery/report actions.
- The checked-in local host-adapter document does not yet declare backup or
  network/export authority.

What this means:

- Not blocked by Traverse packaging mechanics.
- Blocked by missing declared host authority in this repo.

## 5. `callweave.model-improve`

Current state:

- Pure decision gate logic exists.
- The app-level surface implies training, evaluation, publish, and rollback
  authority.

What this means:

- Not blocked by Traverse packaging mechanics.
- Blocked by missing declared model-training/release authority in this repo.

## 6. `callweave.review-prepare`

Current state:

- A reusable pure package exists at `capabilities/review.prepare/`.
- The app-level draft depends on privacy-gated advisory review exchange rules.

What this means:

- The unresolved advisory LMM boundary remains the blocker.
- This should not be packaged as a fake local-compatible app until the
  external-review execution rules are finalized.
