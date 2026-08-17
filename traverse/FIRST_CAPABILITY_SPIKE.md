# First standalone capability spike — `evidence.policy-resolve`

**Date:** 2026-08-11  
**Goal:** exercise the current Traverse capability authoring path with a pure,
standalone capability that has no application workflow, connector, model,
filesystem, network, or state dependency.

## Capability selected

`evidence.policy-resolve` receives a scored evidence claim and a versioned
policy, then deterministically returns one of:

- `provisional` for a high-confidence expected/possible claim;
- `unknown` when confidence is below policy;
- `surprising` for high-confidence rare evidence;
- `rejected` for a hardware-incompatible assertion.

The policy is supplied as input. The capability contains no Golden, Callweave
workflow, microphone, database, model, or daily-art logic.

## What succeeded

1. `traverse-cli capability new evidence.policy-resolve` created a real package
   scaffold under `capabilities/evidence.policy-resolve`.
2. The placeholder contract was replaced with strict standalone input/output
   schemas and four covered use cases.
3. The no-std WASI guest was implemented and compiled to
   `artifacts/policy-resolve.wasm`; the build updates the package digest.
4. `traverse-cli capability inspect contract.json` accepted the contract as an
   active, stateless, no-host-access capability.
5. Four runtime requests were created for provisional, unknown, surprising,
   and rejected outputs.

## Initial blocker and resolution

`traverse-cli capability-package inspect manifest.json` rejects the package
when `workflow_refs` is empty:

```text
capability package must declare at least one approved workflow reference
```

This initially prevented execution through `capability-package execute`,
despite the capability contract itself validating. Adding a Callweave workflow
merely to satisfy this condition would have violated the portability rule.

The current Traverse CLI now accepts optional `known_compositions` metadata.
With `"known_compositions": []`, both package inspection and direct package
execution succeed. This restores the correct composition direction: workflows
may reference capabilities, while reusable capability packages need not know
their consumers.

## Required Traverse decision (completed)

Allow a pure standalone capability package to declare an empty
`workflow_refs` list. A workflow should reference a capability, rather than a
reusable capability package being required to reference a workflow.

If a package-to-workflow relationship remains useful for discovery, make it
optional and additive, not a package validation prerequisite. Application
bundle registration can validate that a workflow's capability references have
executable packages at composition time.

## Secondary implementation note

The generated no-std/WASI approach relies on fixed `static mut` input/output
buffers. Rust emits `static_mut_refs` warnings under the 2024 compatibility
lint. The artifact still builds, but the executable package template should
move to raw-pointer/safe-wrapper buffer handling before this becomes a default
production authoring path.

## Status

The standalone contract, WASM artifact, package inspection, and all four
runtime requests pass. No artificial workflow was added.
