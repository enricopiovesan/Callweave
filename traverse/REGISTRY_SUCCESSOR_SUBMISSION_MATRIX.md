# Registry successor publication matrix

Decision recorded in [issue #528](https://github.com/traverse-framework/registry/issues/528): keep immutable `1.0.0` drafts unchanged and publish reviewed successors.

| Capability | Proposed successor | Artifact policy | Evidence still required |
|---|---:|---|---|
| `artifact.shareability-classify` | `1.1.0` | Same artifact only if byte-identical and re-attested | Qualified Rust/security review, CI URL, final contract review |
| `audio.pcm-transform` | `1.1.0` | Same artifact only if byte-identical and re-attested | Qualified Rust/security review, CI URL, final contract review |
| `audio.pcm-window` | `1.1.0` | Same artifact only if byte-identical and re-attested | Qualified Rust/security review, CI URL, final contract review |
| `audio.privacy-risk-evaluate` | `1.1.0` | Same artifact only if byte-identical and re-attested | Qualified Rust/security review, CI URL, final contract review |
| `audio.wav-pcm16-decode` | `1.1.0` | Reuse only the signed artifact after digest verification | Qualified Rust/security review, CI URL, final contract review |
| `candidate.policy-evaluate` | `1.1.0` | Same artifact only if byte-identical and re-attested | Qualified Rust/security review, CI URL, final contract review |
| `event.append-plan-create` | `1.1.0` | Same artifact only if byte-identical and re-attested | Qualified Rust/security review, CI URL, final contract review |
| `model.activation-plan-create` | `1.1.0` | Reuse only the signed artifact after digest verification | Qualified Rust/security review, CI URL, final contract review; no model selected |
| `retention.action-plan-create` | `1.1.0` | Same artifact only if byte-identical and re-attested | Qualified Rust/security review, CI URL, final contract review |

## Submission rules

- One capability per Registry PR, each branched from current `main`.
- Do not edit or delete any existing `1.0.0` contract or signature.
- Confirm the Registry maintainer's accepted semver classification before
  opening PRs; `1.1.0` is a proposal, not an authorization.
- Add `authoring.review.decision`, reviewer identity, and PR reference only
  after the reviewer has actually completed the review.
- Pin Callweave references only after the successor is active, signed, and in a
  released index.

## Auditable source revision

The nine successor packages and their WASM artifacts are frozen in a public,
immutable Callweave revision for Registry review:

- Branch: [`codex/capability-successor-evidence-2026-09-16`](https://github.com/enricopiovesan/Callweave/tree/codex/capability-successor-evidence-2026-09-16)
- Commit: [`2d9f5e4`](https://github.com/enricopiovesan/Callweave/commit/2d9f5e4309585b2a201f52b5d27f6ab592d4d8ca)
- Tag: [`callweave-capabilities-2026-09-16`](https://github.com/enricopiovesan/Callweave/tree/callweave-capabilities-2026-09-16)

This revision is evidence-only: it contains the nine generic capability
packages, runtime fixtures, source, manifests, and bounded WASM artifacts.
It does not select or download an ML model. The local smoke suites passed
before publication; Registry CI and the qualified maintainer/security review
remain the gates for successor activation.

## Publication record

All nine successor PRs were merged and signed:

- [#529](https://github.com/traverse-framework/registry/pull/529) `audio.pcm-transform`
- [#530](https://github.com/traverse-framework/registry/pull/530) `audio.pcm-window`
- [#531](https://github.com/traverse-framework/registry/pull/531) `audio.privacy-risk-evaluate`
- [#532](https://github.com/traverse-framework/registry/pull/532) `audio.wav-pcm16-decode`
- [#533](https://github.com/traverse-framework/registry/pull/533) `artifact.shareability-classify`
- [#534](https://github.com/traverse-framework/registry/pull/534) `candidate.policy-evaluate`
- [#535](https://github.com/traverse-framework/registry/pull/535) `event.append-plan-create`
- [#536](https://github.com/traverse-framework/registry/pull/536) `model.activation-plan-create`
- [#537](https://github.com/traverse-framework/registry/pull/537) `retention.action-plan-create`
- [#539](https://github.com/traverse-framework/registry/pull/539) consolidated CI-generated signatures

Registry main CI run [#35056522316](https://github.com/traverse-framework/registry/actions/runs/35056522316) completed successfully, including capability validation, signing, catalog build, index publication, and deployment.
