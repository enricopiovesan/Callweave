# Traverse project ticket: typed host-connector invokes in application manifests

## Problem

Traverse's raw application state-machine validator and WASM runtime support host-connector invokes, for example:

```json
{ "invoke": { "host_connector": "audio.permission.request" } }
```

The typed application-manifest parser used by `traverse-cli app validate` and `traverse-cli app activate` currently deserializes every invoke as a capability invoke and requires `capability_id`. A valid mediated host-connector state machine therefore fails before activation with `missing field capability_id`.

## Governing specifications

- `104-mediated-connector-invocation` — bounded, declared, mediated connector calls.
- `137-host-connector-command-dispatch` — application host-connector command and result routing.
- `139-application-state-machine` — runtime-owned application state machines and invoke routing.
- `044-application-bundle-manifest` — application manifest schema.
- `046-public-cli-app-registration` — validate, activate, and register behavior.

If the approved versions do not cover the manifest representation, amend the governing spec/ADR before implementation and update `approved-specs.json`.

## Scope

1. Extend the typed application-manifest schema to accept exactly one of `invoke.capability_id` (with optional `input_from`) or `invoke.host_connector` (with the declared connector command).
2. Preserve mutual-exclusion, non-empty-field, connector declaration, version compatibility, bounded payload, redacted diagnostic, and offline rules.
3. Preserve terminal routing for `host_connector_succeeded`, `host_connector_failed`, `host_connector_timeout`, and `host_connector_cancelled`.
4. Keep existing capability-invoke validation and component declaration checks unchanged.
5. Ensure CLI validate/activate/register, workspace materialization, Rust WASM runtime, web embedder, Swift, and Kotlin consumers retain identical normalized semantics.

## Acceptance criteria

- Host-connector manifests validate, activate, and register successfully.
- Capability and host-connector invokes are mutually exclusive; neither, both, empty, unknown, or malformed fields fail closed with stable redacted errors.
- Undeclared connectors and incompatible versions fail during activation.
- Success, failure, timeout, and cancellation produce distinct stable runtime events.
- Existing capability-only manifests remain byte-compatible and pass all regression suites.
- Offline validate/activate/register make zero network calls after the required Registry cache is prepared.
- No credentials, private connector configuration, filesystem paths, or authorization headers appear in diagnostics or persisted registration state.
- The normalized manifest is accepted by web, Rust native, Swift, and Kotlin embedders.

## Required tests

- Parser unit tests for both invoke variants and malformed combinations.
- CLI fixtures for validate, activate, register, offline activation, undeclared connector, and incompatible connector version.
- Runtime fixtures for connector success, failure, timeout, and cancellation.
- Web embedder mediated-audio conformance test.
- Swift and Kotlin manifest-loading/conformance tests.
- Regression runs for Specs 044, 046, 104, 137, and 139.

## Definition of done

- [ ] Governing spec/ADR is approved or existing approved specs are explicitly confirmed sufficient.
- [ ] Typed parser and raw validator enforce the same rules.
- [ ] CLI validate/activate/register implementation is merged and released.
- [ ] Runtime and embedder normalized semantics are covered on every supported target.
- [ ] All positive/negative, offline, redaction, and compatibility tests pass in CI.
- [ ] Documentation, migration notes, and minimum Traverse version are published.
- [ ] Callweave PWA exact Registry preparation, activation, and registration pass without a local capability fallback.
- [ ] Project item moves to Done only after a released artifact is consumed by a downstream app smoke test.
