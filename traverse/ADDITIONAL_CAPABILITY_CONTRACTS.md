# Additional generic capability contracts

These contracts formalize the implementations in `src/business-logic.mjs`.
Each package is stateless, deterministic, location-neutral, and safe for local
or browser WASM execution.

## `acoustics.event-qualify@1.0.0`

Input: `{ windows, policy: { version, minimum_rms, minimum_windows } }`.
Each window may contain `window_id`, `activity`, `signal_rms`,
`background_dominant`, and `clipped`.

Output: `{ policy_version, qualified, qualified_window_ids,
rejected_window_count, reason }`.

Rules: only active, non-clipped, non-background windows above the RMS policy
count as qualified. No taxon or model label is produced. Empty/malformed
windows fail with `invalid_request`.

## `acoustics.background-classify@1.0.0`

Input: `{ windows, policy: { version, dominance_ratio } }`.

Output: `{ policy_version, category, dominant_windows, total_windows,
dominance_ratio }`, where category is `continuous_background`,
`mixed_background`, or `no_dominant_background`.

Rules: classification uses only supplied quality facts; it never inspects raw
audio or identifies a source. Empty/malformed windows fail with
`invalid_request`.

## `evaluation.calibration-assess@1.0.0`

Input: `{ cases, policy: { version } }`, where each case has optional
`expected_taxon` and `predicted_taxon`.

Output: `{ policy_version, case_count, correct_count, accuracy_millis,
labeled_positive_count, predicted_positive_count, unknown_count, policy }`.

Rules: metrics are descriptive only. The capability never chooses thresholds,
activates a model, or promotes an observation. Empty/malformed cases fail with
`invalid_request`.

## Packaging and Registry DoD

- Contract JSON includes happy/unhappy use cases, schemas, permissions,
  `memory_only` side effects, no filesystem/network/device access, and
  `authoring.method`.
- Rust/WASI fixture implementation is built reproducibly with a pinned toolchain.
- Manifest digest, SHA-256 artifact, labels (if any), and runtime requests are
  checked in.
- Pure JSON fixtures cover valid, empty, malformed, background-only, clipped,
  and deterministic replay cases.
- `npm run pure-capabilities:fixtures`, Traverse contract validation, and WASM
  artifact validation pass.
- Submit each package as an independent Registry PR; do not couple these
  capabilities to Callweave workflow or UI manifests.
