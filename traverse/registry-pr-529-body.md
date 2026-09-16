## Summary
Publish the capability named in this PR as an immutable generic `1.1.0` successor to its existing 1.0.0 draft. The capability is location-, device-, model-, and workflow-neutral.

## Governing Spec
- `001-registry-foundation`
- `005-yank-deprecation`
- `006-public-scope-and-identity`
- `007-artifact-hosting`
- `014-extraction-compatibility`
- `018-capability-test-coverage`
- `023-authoring-assurance`
- `024-capability-risk-classification-adoption`

## Project Item
Standalone Registry capability publication. No application workflow or Callweave-specific behavior is included.

## Definition of Done
- Contract and source crate validate; required personas resolve.
- Rust unit tests and coverage gates pass.
- Artifact digest/signing workflow completes after merge.
- Maintainer Rust/security review is recorded before lifecycle promotion.
- Registry required checks are green.

## Validation
- Public Callweave source revision: https://github.com/enricopiovesan/Callweave/commit/2d9f5e4309585b2a201f52b5d27f6ab592d4d8
- Nine WASM smoke suites and local validation passed.
- Maintainer/security approval: https://github.com/traverse-framework/registry/issues/528#issuecomment-5691652292
- Existing 1.0.0 draft remains immutable; no model artifact is selected.

The successor remains draft pending qualified implementation/security review and normal post-merge signing.
