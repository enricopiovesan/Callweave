# Remaining executable gaps

**Last verified:** 2026-08-20

At this time there are no remaining Callweave app-level contracts that are not
honestly executable through the checked-in Traverse bundles.

The repo still distinguishes:

- reusable pure kernels under `capabilities/`
- app-boundary compatible bundles under `apps/callweave-*`
- host-owned authority declarations under
  `traverse/host-adapters/local-first-host-adapters.json`

Future gaps should be recorded here only when a new app-level contract exists
without a declared authority boundary and checked-in executable bundle.
