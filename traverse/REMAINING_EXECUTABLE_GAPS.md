# Remaining executable gaps

**Last verified:** 2026-08-20

This file records the remaining Callweave app-level contracts that are not yet
honestly executable through the checked-in Traverse bundles.

## 1. `callweave.operations-recover`

Current state:

- Pure logic exists.
- The app-level surface includes export, backup, and recovery/report actions.
- The checked-in local host-adapter document does not yet declare backup or
  network/export authority.

What this means:

- Not blocked by Traverse packaging mechanics.
- Blocked by missing declared host authority in this repo.

## 2. `callweave.model-improve`

Current state:

- Pure decision gate logic exists.
- The app-level surface implies training, evaluation, publish, and rollback
  authority.

What this means:

- Not blocked by Traverse packaging mechanics.
- Blocked by missing declared model-training/release authority in this repo.

## 3. `callweave.review-prepare`

Current state:

- A reusable pure package exists at `capabilities/review.prepare/`.
- The app-level draft depends on privacy-gated advisory review exchange rules.

What this means:

- The unresolved advisory LMM boundary remains the blocker.
- This should not be packaged as a fake local-compatible app until the
  external-review execution rules are finalized.
