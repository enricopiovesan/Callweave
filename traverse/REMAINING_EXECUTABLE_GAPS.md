# Remaining executable gaps

**Last verified:** 2026-08-20

This file records the remaining Callweave app-level contracts that are not yet
honestly executable through the checked-in Traverse bundles.

## 1. `callweave.review-prepare`

Current state:

- A reusable pure package exists at `capabilities/review.prepare/`.
- The app-level draft depends on privacy-gated advisory review exchange rules.

What this means:

- The unresolved advisory LMM boundary remains the blocker.
- This should not be packaged as a fake local-compatible app until the
  external-review execution rules are finalized.
