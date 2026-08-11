# Callweave Pipeline Council Audit — Pass 2 (2026-08-11)

**Verdict:** The repaired event graph has removed the first-pass routing and privacy-ordering defects. It is now a coherent **draft architecture**, but it is not yet detailed enough to implement safely as WASM capabilities or an active Traverse workflow.

This is a structured, role-based application of the LLM Council method: independent review lenses, cross-review, and a chairman synthesis. It does not claim that multiple external LLM providers were called.

## Scope reviewed

The review covers the generated Callweave surface as of this pass: **18 draft capabilities** and **21 draft events**. It particularly examines the repaired outcome routes, unknown-review path, daily close, coverage, retention, and canvas creation.

## Stage 1 — independent reviews

| Persona | Assessment after the repair |
|---|---|
| Bioacoustician | The four detection outcomes correctly preserve uncertainty, but their payloads do not yet state which outcome was selected or carry typed acoustic evidence. |
| UMA/Traverse contract engineer | The topology is safer, but the contracts are strict only at the envelope level: most domain values are generic references with unconstrained `metadata`. |
| Workflow/runtime engineer | Publisher/subscriber maps describe possible edges, not a runnable workflow. Routing conditions, joins, scheduler invocation, retries, and compensations remain unspecified. |
| Privacy reviewer | Ordering is now correct: unknown clusters are selected before review assets are sanitized. The privacy result still needs an explicit manifest of approved assets and a sanitization attestation. |
| Operations engineer | `daily-close` establishes the right boundary, but its local date, timezone, coverage report, and once-per-day key are described rather than schema-enforced. Coverage and retention have no declared invocation route. |
| Wildlife-data steward | Candidate-set provenance remains the right direction. Typed taxonomy/source/version fields and a refresh/reconciliation workflow are still necessary before a location database becomes durable. |
| Artist/product designer | A close-of-day canvas is now possible even on quiet days. There is no explicit correction-to-revision route, so later validated evidence could leave an artwork stale or be silently overwritten. |
| Local-first implementer | The architecture correctly preserves a local companion fallback, but no WASM package, model manifest, host adapter, storage implementation, or 24-hour capture proof exists yet. |

## Stage 2 — cross-reviewed findings

| Rank | Finding | Severity | Required correction |
|---:|---|---|---|
| 1 | `detection-resolve` can emit four mutually exclusive outcome events, but its result schema has no `resolution_state` enum that determines exactly one route. | Critical | Add a typed result with `resolution_state: provisional | unknown | surprising | rejected`; bind every use case to one emitted event and make the router reject zero or multiple selections. |
| 2 | The generated contracts use generic entity/reference shapes (`id`, `version`, free-form `metadata`) for domain facts. | Critical | Define reusable, versioned schemas for recording/window, acoustic evidence, candidate set, coverage report, unknown cluster, sanitized asset manifest, review package, daily close, and canvas revision. |
| 3 | Event payloads are generic (`workspace_id`, `location_id`, `trace_ref`, `result_ref`) and do not carry the typed facts needed to route or validate downstream work. | Critical | Give each event a bounded, event-specific payload schema; references must resolve to an immutable typed record in local storage. |
| 4 | No executable workflow exists: subscriber lists do not encode filters, joins, retries, idempotency claims, ordering, or error compensation. | High | Add a workflow specification and executable fixtures only after the domain/event schemas are tightened. |
| 5 | `daily-close` is scheduler-driven but the scheduler/host adapter is only implicit; its date, timezone, coverage reference, and `<location-id>:<local-date>` idempotency invariant are not required fields. | High | Define a scheduler host-adapter contract or direct command boundary, plus a typed `DailyClose` schema and duplicate/late-close fixtures. |
| 6 | `coverage-assess` and `evidence-retain` are topologically orphaned. | High | Specify whether each is invoked by a scheduler, storage lifecycle hook, or a typed event, then add its trigger and completion/failure facts. |
| 7 | `privacy-protect` does not output a typed allowed-asset manifest proving exactly which clips are safe for the optional LMM ZIP. | High | Require asset hashes, transformations/redactions, policy version, expiry/retention class, and an explicit deny/no-export result. |
| 8 | All capabilities describe local state changes while sharing generic host-owned state shapes; transaction boundaries and state ownership are unclear. | High | Give each capability explicit owned/read state records, optimistic-version/idempotency behavior, and atomic transition guarantees. |
| 9 | Canvas corrections are described as revisions but no event/capability route requests, renders, or retains them. | Medium | Add explicit immutable revision semantics, e.g. `daily.revision-requested` and `daily.canvas-revised`, with provenance and user-visible revision numbering. |
| 10 | Candidate-data freshness/reconciliation and field calibration remain deferred. | Medium | Add source refresh/version migration workflows and a Golden annotated pilot with measurable precision, recall, and unknown-cluster stability. |
| 11 | Continuous PWA capture, lossless storage pressure, and companion interoperability remain unproven. | Medium | Run and preserve a 24-hour capture/recovery benchmark before choosing browser-only as a production path. |

## Chairman synthesis

The first pass corrected the important *graph-level* mistakes: known observations no longer flow through the unknown-review branch, privacy is downstream of unknown selection, and daily rendering has a close-of-day boundary. That work should remain.

The next risk is **false contract precision**. A JSON Schema can be syntactically strict while the actual business data sits in unconstrained `metadata`. Until the shared domain records, event payloads, state transitions, and workflow conditions are typed, different WASM implementations could all satisfy the current contracts while behaving incompatibly.

Therefore, do not begin independent implementation of the 18 WASM capabilities yet. First complete a contract-hardening slice; then make one thin, end-to-end vertical workflow executable with local fixtures.

## Required contract-hardening sequence

1. Introduce shared versioned domain schemas and replace generic domain references in capability inputs, outputs, state, and event payloads.
2. Make detection resolution exclusive and machine-checkable; test all four outcomes plus invalid/ambiguous routing.
3. Define the host boundaries: scheduler, clock/timezone, recorder, filesystem/object store, model runtime, and local state transaction adapter.
4. Connect coverage and retention to explicit lifecycle triggers and model their failure/late/retry cases.
5. Define daily close and canvas revision as immutable, idempotent records; include quiet, partial-coverage, duplicate-close, late-evidence, and corrected-observation fixtures.
6. Create an executable Traverse workflow definition with route predicates, joins, retries, dead-letter handling, and replay semantics.
7. Implement a narrow local vertical slice: one recorder source, one classifier, provisional/unknown routing, privacy-safe package assembly, daily close, and one reproducible canvas.

## Release gates

| Gate | Status | Evidence needed |
|---|---|---|
| Safe topology | Passed in draft | Distinct outcome and privacy routes are generated and validated. |
| Enforceable domain contracts | Not ready | Typed schemas plus contract and negative-path fixtures. |
| Executable local workflow | Not ready | Workflow definition, local adapters, replay/idempotency tests. |
| Privacy-safe optional LMM export | Not ready | Sanitized asset manifest, redaction tests, no-export policy test. |
| Trustworthy field capture | Not ready | 24-hour Golden pilot including power/storage/restart/coverage evidence. |
| Measurable identification quality | Not ready | Annotated evaluation set, model/threshold versions, error metrics. |

## Opportunities preserved by the revised design

- Treat coverage, weather/noise, uncertainty, and equipment failure as distinct visual material rather than pretending every quiet canvas means ecological silence.
- Let a reviewed correction create a traceable new daily-art revision, making the canvas a living archive rather than a mutable assertion.
- Make typed local evidence records portable across a browser PWA and companion runtime without allowing either runtime to redefine biological truth.
- Keep the optional LMM path narrow: it reads a privacy-approved package and returns a proposal that static validation and human approval must still govern.

## Council decision

**Approve the repaired direction; block implementation-package generation until the contract-hardening sequence is complete.** The next deliverable should be typed shared schemas and a workflow specification, not more isolated capability shells.
