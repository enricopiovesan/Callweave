# New WASM capability submission packet

The following four packages are implemented and pushed on the Callweave branch
`codex/capability-successor-evidence-2026-09-16`:

| Capability | Source revision | Artifact | Local verification |
|---|---|---|---|
| `audio.signal-quality-evaluate` | `358857b` | `capabilities/audio.signal-quality-evaluate/artifacts/signal-quality-evaluate.wasm` | `audio:quality-activity:build` |
| `audio.activity-interval-classify` | `35937ca` | `capabilities/audio.activity-interval-classify/artifacts/activity-interval-classify.wasm` | `audio:quality-activity:smoke` |
| `inference.score-calibrate` | `5f48de4` | `capabilities/inference.score-calibrate/artifacts/score-calibrate.wasm` | direct WASI smoke |
| `inference.ensemble-reconcile` | `673aa3a` | `capabilities/inference.ensemble-reconcile/artifacts/ensemble-reconcile.wasm` | direct WASI smoke |

## Registry submission requirements

Create one Registry PR per capability under `capability-src/`, preserving the
contract semantics and adding the Registry package metadata required by the
current validation schema. Each PR must include:

- public Callweave source revision and artifact digest;
- `authoring.method: "llm-assisted"`;
- a reviewable CI run URL from the Callweave build/test pipeline;
- qualified Rust/security implementation approval;
- risk and licensing metadata;
- happy and unhappy runtime fixtures;
- the governing `001-registry-foundation` reference.

These packages are **not yet published**. No Registry PR should be opened with
placeholder reviewer approval or fabricated CI URLs. After the qualified review
and CI evidence are available, submit each package separately and complete the
Registry signing/index follow-up after merge.
