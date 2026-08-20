# Callweave registry publish plan

Last verified: 2026-08-20

This document separates local Traverse validation from actual upstream registry
publication.

## What is already complete

- Pure WASM capability packages exist under `capabilities/`.
- Local app-boundary compatible bundles exist under `apps/callweave-*`.
- Local Traverse `app validate` and `app register` checks passed for the
  current Callweave capability set.

That work proves local executable coverage. It does **not** publish anything to
the shared Traverse registry.

## What Traverse publish actually expects

Traverse's governed publish path is:

```bash
traverse-cli capability publish \
  --contract <contract.json> \
  --artifact <artifact.wasm> \
  --registry-repo <clean-registry-checkout> \
  --json
```

Key facts:

- It publishes **capability artifacts**, not local app-boundary wrappers.
- It resolves each `use_cases[].persona_ref` against
  `personas/<id>/<version>/persona.json` in the target registry checkout.
- It opens a reviewable registry PR and still requires CI + human review.

## The right publish targets from this repo

The first real publication targets are the pure reusable WASM capabilities:

1. `location.initialize`
2. `operations.recover`
3. `model.improve`
4. `review.prepare`

These correspond to:

- [capabilities/location.initialize](/Users/enricopiovesan/Documents/repos/Callweave/capabilities/location.initialize)
- [capabilities/operations.recover](/Users/enricopiovesan/Documents/repos/Callweave/capabilities/operations.recover)
- [capabilities/model.improve](/Users/enricopiovesan/Documents/repos/Callweave/capabilities/model.improve)
- [capabilities/review.prepare](/Users/enricopiovesan/Documents/repos/Callweave/capabilities/review.prepare)

The `apps/callweave-*` bundles remain local app-integration surfaces. They are
not the first upstream capability publish path.

## Current blockers

### 1. Persona records are local only

The Callweave contracts reference these personas:

- `callweave-artist`
- `callweave-field-operator`
- `callweave-location-owner`
- `callweave-reviewer`
- `callweave-runtime`
- `callweave-system-administrator`

Today those persona records exist under:

- [traverse/personas](/Users/enricopiovesan/Documents/repos/Callweave/traverse/personas)

They do **not** yet exist in the target registry checkout under:

- `personas/<id>/<version>/persona.json`

Until they are added there, `traverse-cli capability publish --dry-run` will
fail with unresolved persona references.

### 2. Registry checkout must be clean

The target registry repo is expected to be a clean checkout before running the
governed publish flow.

## Checked-in readiness audit

Run:

```bash
node scripts/check_registry_publish_readiness.mjs
```

Optional custom registry path:

```bash
node scripts/check_registry_publish_readiness.mjs /path/to/registry
```

The audit reports:

- whether the registry repo exists
- whether the registry repo is dirty
- whether each required Callweave persona exists in the registry
- whether the four first publish candidates have both contract and artifact
- whether the current state is ready for `capability publish --dry-run`

## Recommended next real submission order

1. Add the six Callweave personas to the target registry repo.
2. Ensure the target registry checkout is clean.
3. Run dry-run publish for:
   - `location.initialize`
   - `operations.recover`
   - `model.improve`
   - `review.prepare`
4. Fix any coverage/persona/artifact issues reported by Traverse.
5. Run real `capability publish`.
6. Complete registry CI and human review.
