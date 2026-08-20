# Callweave Traverse Contracts

This directory is the contract-first UMA/Traverse surface for Callweave. Its
application contracts remain draft; seventeen reusable, standalone WASI
capability packages live in `../capabilities/`, and a real executable Traverse
foundation app bundle now lives in `../apps/callweave-foundation/`.

## Layout

```text
contracts/callweave/<capability>/contract.json  governed capability contracts
events/callweave/<event>/contract.json          stable domain-event contracts and declared edges
schemas/domain-records.schema.json              shared immutable local-record schemas
workflows/daily-local-first.workflow.json       draft routing, retries, and host boundaries
workflows/fixtures/                             deterministic workflow fixtures
../fixtures/pure-capabilities/                  connector-free business-rule fixtures
host-adapters/local-first-host-adapters.json    explicit host authority and failure boundaries
personas/<persona>/1.0.0/persona.json           persona references used by contract use cases
capability-inventory.json                        inventory of all contract-first capabilities
wasm/implementation-plan.json                   future local model and advisory-agent bindings
```

## Architecture rules

- One contract represents one meaningful business capability. Internal operations are not published as separate microservices solely because they are small.
- Every contract has strict input/output JSON schemas, one happy path, and invalid-input, dependency-unavailable, and policy-denied unhappy paths.
- Durable local state belongs to a host-owned local DataStore or sandboxed file adapter. A WASM guest receives references and JSON through stdin/stdout; it never assumes ambient filesystem, network, device, credential, or model-provider access.
- A contract that needs device, storage, model-cache, or source-provider access declares `host_api_access: exception_required` and carries the `callweave-host-adapter-boundary` exception reference.
- Raw audio, evidence, proposal, knowledge, and observation history are append-only/versioned. A correction supersedes history; it does not rewrite it.
- Standard recording and interpretation workflows are deterministic. The optional LMM advisor can only return an advisory proposal through `traverse.inference.generate`; the governed runtime validates it and a human approves durable knowledge changes.
- Events express stable domain facts such as `callweave.audio.recording-finalized`, `callweave.acoustic.evidence-produced`, and the exclusive `callweave.detection.*` outcomes. The workflow specification supplies route predicates without allowing a capability to bypass governed state.

## Local storage boundary

`state_schema` specifies the portable state-reference shape that each capability may request through the host runtime. The host owns the actual local store, encryption, retention, audio files, model cache, and backup target. This keeps the same contract usable in a browser, local companion, edge device, or cloud host without duplicating business behavior.

## WASM implementation status

The following pure, connector-free capability packages are built and carry
deterministic runtime requests:

- `evidence.policy-resolve`
- `evidence.coverage-assess`
- `detection.resolve`
- `location.initialize`
- `observation.manage`
- `knowledge.manage`
- `daily.create`
- `daily.close`
- `operations.recover`
- `evidence.retention-classify`
- `evidence.cluster-curate`
- `evidence.visual-artifact-render`
- `artifact.versioned-revision-create`
- `model.improve`
- `review.prepare`
- `unknown.organize`
- `privacy.gate-evaluate`

They are reusable building blocks, not implementations of the draft
Callweave application contracts. Their guests have no host API, filesystem,
network, model, or workflow authority.

Those packages are now also composed into a validated and locally registered
Traverse application bundle at `../apps/callweave-foundation/`. That bundle is
the current executable integration boundary for Traverse app manifests,
component manifests, workflow registration, and workspace registration. The
broader `traverse/contracts/callweave/*` surface remains draft because several
application-specific capabilities still lack executable package coverage.

There is now also a first compatible-mode host-integrated test bundle at
`../apps/callweave-audio-source-configure/`. It validates and registers a
single `callweave.audio-source-configure` component in `execution_mode:
compatible`, backed by a thin wrapper and a host-side smoke harness. This is
the first checked-in path for a connector-bound Callweave capability.

A second compatible-mode host-integrated test bundle now lives at
`../apps/callweave-model-manage/`. It validates and registers a single
`callweave.model-manage` component in `execution_mode: compatible`, again
through a thin wrapper and a host-side smoke harness. This extends the checked-
in connector-bound path from device/source setup into model-cache management.

A third compatible-mode host-integrated test bundle now lives at
`../apps/callweave-acoustics-classify/`. It validates and registers a single
`callweave.acoustics-classify` component in `execution_mode: compatible`,
through a thin wrapper and a host-side smoke harness. This extends the checked-
in connector-bound path into prepared-audio evidence production.

A fourth compatible-mode host-integrated test bundle now lives at
`../apps/callweave-privacy-protect/`. It validates and registers a single
`callweave.privacy-protect` component in `execution_mode: compatible`,
through a thin wrapper and a host-side smoke harness. This extends the checked-
in connector-bound path into privacy gating and safe review-package preparation.

A fifth compatible-mode host-integrated test bundle now lives at
`../apps/callweave-audio-capture/`. It validates and registers a single
`callweave.audio-capture` component in `execution_mode: compatible`,
through a thin wrapper and a host-side smoke harness. This extends the checked-
in connector-bound path by closing the device-side recording boundary between
source configuration and prepared-audio processing.

A sixth compatible-mode host-integrated test bundle now lives at
`../apps/callweave-daily-close/`. It validates and registers a single
`callweave.daily-close` component in `execution_mode: compatible`,
through a thin wrapper and a host-side smoke harness. This extends the checked-
in connector-bound path into scheduler-adjacent local-day closure and
append-only close-record authority.

A seventh compatible-mode host-integrated test bundle now lives at
`../apps/callweave-daily-revise/`. It validates and registers a single
`callweave.daily-revise` component in `execution_mode: compatible`,
through a thin wrapper and a host-side smoke harness. This extends the checked-
in connector-bound path into immutable daily-canvas revision handling.

A eighth compatible-mode host-integrated test bundle now lives at
`../apps/callweave-daily-create/`. It validates and registers a single
`callweave.daily-create` component in `execution_mode: compatible`,
through a thin wrapper and a host-side smoke harness. This extends the checked-
in connector-bound path into deterministic daily-canvas creation and archive
publication boundaries.

A ninth compatible-mode host-integrated test bundle now lives at
`../apps/callweave-evidence-retain/`. It validates and registers a single
`callweave.evidence-retain` component in `execution_mode: compatible`,
through a thin wrapper and a host-side smoke harness. This extends the checked-
in connector-bound path into governed retention classification and append-only
lifecycle decision recording.

A tenth compatible-mode host-integrated test bundle now lives at
`../apps/callweave-observation-manage/`. It validates and registers a single
`callweave.observation-manage` component in `execution_mode: compatible`,
through a thin wrapper and a host-side smoke harness. This extends the checked-
in connector-bound path into append-only observation governance.

A eleventh compatible-mode host-integrated test bundle now lives at
`../apps/callweave-knowledge-manage/`. It validates and registers a single
`callweave.knowledge-manage` component in `execution_mode: compatible`,
through a thin wrapper and a host-side smoke harness. This extends the checked-
in connector-bound path into reviewer-governed knowledge versioning.

The connector-free policy and transition rules that are not yet packaged as
WASI artifacts are covered by deterministic JSON fixtures in
`../fixtures/pure-capabilities/`. These fixtures are the current executable
behavior contract for the pure portion of `location-initialize`.

The planned model and host-integrated modules appear in
[wasm/implementation-plan.json](wasm/implementation-plan.json). When an
implementation begins:

1. Keep the contract version stable unless the schema changes.
2. Create one WASM capability package per implementation using Traverse's governed package template.
3. Bind only declared host adapters and model dependencies.
4. Produce deterministic fixtures, a SHA-256 digest, and use-case runtime requests.
5. Validate with `traverse-cli capability-package inspect` and execute before changing lifecycle from `draft`.

The advisory LMM agent is not a direct provider client. Its future package declares the abstract `traverse.inference.generate` dependency and leaves provider selection/configuration to the host runtime.

## Regeneration and checks

Contracts are generated from the checked-in source of truth:

```bash
node scripts/generate_traverse_contracts.mjs
npm run pure-capabilities:fixtures
node scripts/run_workflow_fixtures.mjs
find traverse/contracts/callweave -name contract.json -print0 | xargs -0 -n1 jq -e .
```

Before publishing to a Traverse registry, move or publish the persona records to
the target registry and run the registry-aware `capability publish --dry-run`
flow. The application contracts in this directory are intentionally `draft`
until their application-specific executable packages and governed evidence
exist.
