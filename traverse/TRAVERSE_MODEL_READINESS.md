# Traverse model execution readiness

Updated 2026-11-12 from Traverse v0.17.0 and the current Callweave artifact set.

## What is available now

- Traverse v0.17.0 and the web embedder support signed Spec 138 exact-reference
  model packages, browser dependency resolution, explicit host limits, and
  worker cancellation.
- `traverse-cli model package-onnx`, `model sign`, `model verify`, and
  `model pin` are available.
- Swift exact-reference execution is complete for the current native host.
- The generic ONNX runner package path is usable for graphs covered by its
  `tract` execution surface.
- Traverse's newer ABI v3 preparation/snapshot path is now available; it
  removes repeated expensive model initialization and is not the cause of the
  YAMNet failure below.
- Callweave has a legally documented YAMNet candidate and a derived, fixed
  10-second score-only ONNX graph. The package is Apache-2.0 for the weights,
  attributes the AudioSet CC-BY-4.0 class labels, and records conversion
  provenance.
- The local YAMNet package was successfully packaged, signed with a Callweave
  development Ed25519 key, verified, and pinned for both the ABI v2 and ABI v3
  packaging paths. It is not production-signed or committed as a binary
  artifact.

## Remaining Traverse work

| Item | State | Impact |
|---|---|---|
| [#1598](https://github.com/traverse-framework/traverse/issues/1598), consume Registry spec 026 | Open | Rights inspection, revoked-version handling, authenticated Registry contract signatures, and deny-by-default conditional rights. Important for complete rights compliance; not required to locally verify a package. |
| [#1567](https://github.com/traverse-framework/traverse/issues/1567), production model-signing key custody | Open / maintainer setup | Traverse has the implementation; generating and protecting the production key only gates Traverse-signed production packages. Callweave may use its separately governed key meanwhile. |
| [#1582](https://github.com/traverse-framework/traverse/issues/1582), host ceilings and mid-run interruption | Done in v0.17.0 | Web workers can be terminated and host package/memory/fuel limits are enforced; native cancellation/deadline support is released. |
| [#1611](https://github.com/traverse-framework/traverse/issues/1611), Android emulator tests | Done | Android execution evidence is complete for the current target. |
| [#1581](https://github.com/traverse-framework/traverse/issues/1581), third-party-model umbrella | Child work complete | Packaging and guide work is complete; reconcile the umbrella status separately. |
| Generic ONNX runner coverage | Tracked in [Traverse #1666](https://github.com/traverse-framework/traverse/issues/1666) | The graph is supported and executes in direct Wasmtime/Wasmi probes. Governed conformance currently times out because Wasmi consumes about 11.4 billion fuel units and the 1-million-unit fuel-slice loop incurs excessive overhead. |

## What Callweave can do without waiting

1. Keep YAMNet as an evaluation candidate only; do not ship it as a working
   production classifier until a cross-engine conformance vector passes.
2. Reduce or rewrite the graph into the ONNX operator subset supported by the
   audited runner, or select a smaller specialist model whose graph passes.
3. Add the model package's exact digest/key pin only after conformance passes;
   keep private signing keys outside the repository.
4. Continue using the existing local ONNX Runtime evaluator and broad-event
   routing gate as a diagnostic fallback; it is not the Traverse runtime path.
5. Prepare the browser application binding and rights/settings presentation,
   with explicit fail-closed behaviour when the package is absent, revoked, or
   incompatible.

## Current package evidence

- Model: `audio.yamnet.event-gate@1.0.0`
- Source ONNX digest: `94d85a9aa78ffaeb1c6cc19420caacf25eb904d2b1c9457bc3ae4ed2456a271f`
- Current package manifest digest: `8ad551d048a19802790245865fd71d719daba3bd286815d3880b7f8fe4389942`
- WASM digest: `687c2f249a7f190a0c7b967b7599d7c40078c36aa3dae310acc58c43f00e29f6`
- Signature key: Callweave development key (public key is not a production trust root)
- `model verify`: passed
- `model pin`: passed
- `model conformance generate`: timed out in the governed Wasmi path after the
  frame-version fixture was corrected.
- Direct Wasmtime probe: approximately 1.7 seconds and a valid 41,696-byte
  output.
- Direct Wasmi probe: approximately 3.6 seconds and approximately 11.4 billion
  fuel units.
- ABI v3 preparation/snapshot is functioning; the remaining issue is fuel-slice
  overhead, not an unsupported operator or invalid output shape.
