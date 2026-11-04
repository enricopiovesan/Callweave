# Traverse project ticket: register `traverse.audio-input` for application activation

## Problem

Traverse now accepts the canonical host-connector invoke union and checks the
host activation input. However, `traverse-cli app activate` registers only the
built-in reference connector catalog, and that catalog currently omits the
existing `traverse.audio-input` contract.

Callweave declares:

```json
{
  "connector_id": "traverse.audio-input",
  "version_range": "=1.0.0",
  "config_ref": "host-managed-audio-input"
}
```

and supplies a valid host activation input, but activation fails closed with:

```text
connector_unavailable: installed connector traverse.audio-input version 1.0.0 is not a registered connector
```

This is a Traverse registration/catalog gap, not a Callweave capability or
Registry-artifact gap.

## Governing specifications

- `039-connector-plugin-architecture` — connector registration and discovery.
- `104-mediated-connector-invocation` — bounded mediated invocation.
- `137-host-connector-command-dispatch` — connector operation/result routing.
- `140-host-authority-wit-adapters` — audio-input WIT adapter pinning.
- `1773-host-connector-invoke-union` — canonical manifest invoke shape.
- `046-public-cli-app-registration` — application activation behavior.

## Scope

1. Add the checked-in `traverse.audio-input@1.0.0` contract to the reference
   connector catalog used by CLI activation and runtime registration.
2. Ensure its contract metadata, WIT pin, supported targets (`local`,
   `browser`), operation envelopes, and required `authority_ref` configuration
   are loaded from one canonical source.
3. Preserve fail-closed behavior for undeclared connectors, incompatible
   versions, missing authority configuration, malformed input, timeout, and
   cancellation.
4. Keep host/device implementation out of the Traverse business-logic WASM
   capability; the connector remains a mediated host-owned integration.
5. Ensure web, Rust native, Swift, and Kotlin consumers resolve the same
   connector identity and version semantics.

## Acceptance criteria

- `traverse-cli app activate` accepts a manifest declaring
  `traverse.audio-input@=1.0.0` when a matching host activation input is
  present.
- Activation evidence includes the connector identity, version, placement,
  configuration-reference name, WIT pin, and compatibility decision without
  persisting private configuration values.
- A missing connector, incompatible version, missing `authority_ref`, unknown
  operation, malformed request, timeout, cancellation, and policy denial each
  produce stable redacted failure evidence.
- Existing connector activation behavior remains unchanged.
- Offline activation uses only the checked-in connector contract and the
  prepared Registry cache; it performs zero network calls.
- The web embedder and native embedder conformance fixtures resolve the same
  connector contract and operation envelopes.

## Required tests

- Reference-catalog unit test asserting `traverse.audio-input@1.0.0` is
  discoverable.
- CLI activation fixture for permission request and bounded capture.
- Negative fixtures for missing/invalid authority configuration, version
  mismatch, undeclared connector, unknown operation, timeout, cancellation,
  and policy denial.
- WIT package/version/interface validation test.
- Offline activation and redacted-evidence regression tests.
- Web, Swift, Kotlin, and Rust cross-host connector-resolution tests.
- Regression run for Specs 039, 046, 104, 137, 140, and 1773.

## Definition of done

- [ ] Governing specs are confirmed sufficient or amended through the normal
  Traverse approval process.
- [ ] `traverse.audio-input` is registered from the canonical checked-in
  contract in the CLI/runtime reference catalog.
- [ ] Activation validates version, placement, WIT pin, and authority config.
- [ ] Positive and negative CLI/runtime tests pass in CI.
- [ ] Offline, redaction, timeout, cancellation, and policy-denial guarantees
  are evidenced.
- [ ] Web, Rust native, Swift, and Kotlin consumers share the same normalized
  connector semantics, or explicit follow-up tickets are filed.
- [ ] Documentation and release notes identify the minimum Traverse version.
- [ ] Released Traverse artifact is consumed by Callweave.
- [ ] Callweave PWA activation and registration pass with no local capability
  fallback and a declared `traverse.audio-input` host binding.
- [ ] The Project 1 item moves to Done only after the downstream smoke test
  passes against the released artifact.
