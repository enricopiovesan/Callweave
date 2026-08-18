# Callweave Traverse Contracts

This directory is the contract-first UMA/Traverse surface for Callweave. Its
application contracts remain draft; ten reusable, standalone WASI capability
packages live in `../capabilities/` and are deliberately not coupled to this
application workflow.

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
- `evidence.retention-classify`
- `evidence.cluster-curate`
- `evidence.visual-artifact-render`
- `artifact.versioned-revision-create`

They are reusable building blocks, not implementations of the draft
Callweave application contracts. Their guests have no host API, filesystem,
network, model, or workflow authority.

The connector-free policy and transition rules that are not yet packaged as
WASI artifacts are covered by deterministic JSON fixtures in
`../fixtures/pure-capabilities/`. These fixtures are the current executable
behavior contract for the pure portions of `daily-create`, `daily-close`, and
`operations-recover`.

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

Before publishing to a Traverse registry, move or publish the persona records to the target registry and run the registry-aware `capability publish --dry-run` flow. The contracts are intentionally `draft` until their WASM packages and governed evidence exist.
