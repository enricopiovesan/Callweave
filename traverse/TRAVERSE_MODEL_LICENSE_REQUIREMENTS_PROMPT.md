# Request to Traverse runtime: model-rights enforcement

## Ask

Implement the consumer-side enforcement for signed Spec 138 model packages.
The runtime must verify rights before activation and expose the verified record
to every host/application without embedding product-specific policy.

For each exact model reference, verify:

- signature and trusted key identity;
- manifest and artifact digest;
- target and ABI compatibility;
- license identifier and rights completeness;
- attribution, source, redistribution, and commercial-use fields;
- conversion/derivative metadata where applicable;
- package status and revocation state.

The application must be able to provide a generic policy such as
`commercial_use=allowed` or `commercial_use=non-commercial-only`. The runtime
must reject packages that do not satisfy that policy.

## Required behavior

- Missing, ambiguous, or conflicting rights fail closed.
- Rights are checked during register/activate and revalidated according to the
  revocation policy.
- Offline activation uses only a verified cached package.
- Execution results expose model ID, version, digest, license, attribution,
  commercial-use status, and trace information.
- The runtime never silently substitutes a different model because a selected
  package is unavailable.
- The same behavior applies to browser, native, and future embedders.
- No Callweave, species, location, or UI assumptions are added to the runtime.

## Verification evidence

Provide conformance fixtures and tests for:

1. valid permissive package;
2. valid non-commercial package;
3. restricted package accepted only by matching policy;
4. missing license or attribution;
5. unknown commercial-use status;
6. digest/signature mismatch;
7. revoked/deprecated package;
8. offline cache-only activation;
9. rights propagation into execution evidence;
10. native/browser parity.

Document the host API for retrieving rights and the policy decision returned
when activation is denied.

## Acceptance

The runtime work is complete only when all supported embedders enforce the same
rights contract, tests prove fail-closed behavior, and the public API exposes
the verified rights record without requiring UI code to reimplement policy.
