# Callweave → Traverse handoff: remaining runtime gaps

**Date:** 2026-11-02  
**Downstream app:** Callweave  
**Primary target:** Browser/PWA first; native targets follow the same runtime contract.

## Executive summary

Callweave's business-logic capabilities, Registry references, model-package metadata, and browser runtime preparation are in place. The typed application-manifest/runtime gap is resolved by Traverse #1772 / PR #1788 and Registry 0.31.0. The current remaining blocker is connector catalog registration for `traverse.audio-input`, tracked in Traverse #1791.

Callweave must remain a presentation-only app. Audio/device access belongs to a declared, bounded host connector; business logic and model execution remain Traverse-owned WASM capabilities.

## Confirmed current state

- Registry exact-version references resolve through the signed synced index.
- Callweave prepares `core.prepare-inference-request@1.0.0` from the Registry cache and verifies its digest/signature.
- Browser embedder preparation and smoke tests pass.
- Shared capability/workflow, recording-WIT, model-execution schema, candidate-policy, and cross-target conformance checks pass.
- No local capability fallback is used when the Registry artifact is unavailable.
- The application manifest declares mediated connector usage rather than embedding microphone/device code in a capability.
- Model licensing and attribution are represented in the model package/app documentation; no private signing key is stored in the repository.

## Resolved parser blocker

Before Traverse #1772, `traverse-cli app validate` and `traverse-cli app activate` failed on a valid host-connector state-machine invoke before activation:

```text
manifest_parse_failed: failed to parse application manifest
missing field `capability_id`
```

The typed manifest parser currently deserializes every `invoke` as a capability invoke. The raw validator and WASM runtime already understand mediated host-connector invokes, so the typed CLI/application path is inconsistent with the runtime path.

Expected valid shape:

```json
{
  "invoke": {
    "host_connector": "audio.permission.request"
  }
}
```

## Current required Traverse change

The typed invoke union is now released. Traverse must now register the existing `traverse.audio-input@1.0.0` contract in the activation reference catalog so a declared binding can be validated and activated.

The released typed invoke union accepts exactly one of:

```json
{ "capability_id": "core.prepare-inference-request", "input_from": "capture" }
```

or:

```json
{ "host_connector": "audio.permission.request" }
```

The normalized representation must be shared by CLI validation/activation/registration, the Rust WASM runtime, web embedder, Swift embedder, and Kotlin embedder.

### Rules that must remain enforced

1. `capability_id` and `host_connector` are mutually exclusive.
2. One of them is required; empty strings are invalid.
3. Connector commands must be declared by the application and pass activation-time version/compatibility checks.
4. Payloads remain bounded and mediated; no arbitrary host API is exposed to WASM.
5. Timeout, cancellation, connector failure, and connector success remain distinct terminal events.
6. Diagnostics and persisted registration state must redact credentials, private connector configuration, filesystem paths, and authorization headers.
7. Offline validate/activate/register must make zero network calls after the required Registry cache is prepared.
8. Existing capability-only manifests remain byte-compatible.

## Ticket

The parser ticket is complete. The remaining project ticket is filed and attached to Traverse Project 1:

- [Traverse #1791 — Register `traverse.audio-input` in the activation reference connector catalog](https://github.com/traverse-framework/traverse/issues/1791)
- [Traverse #1772 — Support host-connector invokes in application manifests and CLI activation](https://github.com/traverse-framework/traverse/issues/1772) — complete
- [Traverse Project 1](https://github.com/orgs/traverse-framework/projects/1)

The ticket contains the complete acceptance criteria, test matrix, portability requirements, and Definition of Done.

## Related existing tickets

These are already represented in Traverse and should not be duplicated:

- **#1719** — generic mediated `model.execute` connector binding.
- **#1567** — production model-signing key custody, distribution, rotation, and revocation.
- **#1582** — host ceilings and interruption handling across web/native targets.
- **#1470** — durable application state-machine session recovery.
- **#1579 / #1580 / #1581** — native model execution and outside-model packaging work; completed or superseded according to their current status.

## Non-blockers

- Registry capability publication and signed exact-version resolution are not blockers.
- Capability licensing metadata is not a blocker; Registry Spec 025 and the current model rights fields cover the current package requirements.
- Callweave UI/native presentation work is intentionally outside the Traverse business-logic capability layer.
- A universal animal model is not required for this integration milestone; model selection remains configuration-driven.

## Required test evidence

Traverse should add or update:

- Parser unit tests for capability and host-connector variants.
- Negative tests for neither/both/empty/unknown/malformed invoke fields.
- CLI fixtures for validate, activate, register, and offline activation.
- Undeclared connector and incompatible connector-version fixtures.
- Runtime fixtures for success, failure, timeout, and cancellation.
- Web embedder conformance using a mediated audio connector.
- Swift and Kotlin manifest-loading/conformance coverage.
- Regression runs for the governing application-manifest, CLI-registration, connector-mediation, dispatch, and state-machine specifications.

## Definition of Done for Callweave unblock

- [ ] #1772 has an approved governing-spec/ADR decision, or existing approved specs are explicitly confirmed sufficient.
- [ ] Typed parser and raw validator enforce identical invoke rules.
- [ ] CLI validate/activate/register accepts and persists host-connector invokes.
- [ ] Released Traverse artifact is consumed by Callweave.
- [ ] Callweave PWA exact Registry preparation, activation, and registration pass without a local capability fallback.
- [ ] Browser connector invocation reaches the runtime through the declared mediated binding.
- [ ] Native embedders consume the same normalized manifest semantics, or have an explicit tracked follow-up.
- [ ] CI evidence covers positive, negative, offline, redaction, timeout, cancellation, and compatibility cases.

## Requested response from Traverse

Please confirm:

1. Whether #1772 is the correct owner for the typed parser/CLI gap.
2. Whether Specs 044, 046, 104, 137, and 139 are sufficient or need an amendment.
3. The target release containing the fix.
4. The exact normalized manifest shape downstream apps should pin.
5. The conformance command or fixture Callweave should run against the released artifact.

Until #1791 is released, Callweave can prepare the signed Registry artifact and host activation input, but cannot claim end-to-end activation because the Traverse reference catalog rejects the declared audio connector.
