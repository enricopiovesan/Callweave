# Application-scoped Registry preparation dependency

Status checked 2026-09-09:

- Registry `inference.evidence-normalize@1.0.1`: active, signed, present in the current published index (index-v268).
- Registry #412: **closed** — `traverse-registry 0.20.0` is published.
- Traverse #1274: **closed**, but its implementation DoD does not include the new manifest-scoped batch API.

## Required sequence

1. Traverse consumes published `traverse-registry 0.20.0` (spec 997 batch API and `RegistryReference` rename).
2. Traverse completes the Project 1 item **Consume traverse-registry 0.20.0 for manifest-scoped Registry preparation**.
3. Traverse CLI/embedder derives references only from `ApplicationBundleManifest.components[].manifest.registry_ref`.
4. Whole-catalog preparation remains an explicit maintenance mode.
5. Callweave switches from local fallback to the published capability and proves offline validate/register/activate with zero network calls.

This is not additional Registry capability work; it is a Traverse CLI/embedder
dependency on the newly released `traverse-registry` crate. The project item is
the remaining implementation handoff; no Registry contract or index change is
required.

## Current validation evidence

Callweave's pure and business-logic suites pass. Traverse-backed validation
currently fails with:

```text
registry_reference_requires_resolution: verified prepared registry asset is missing
```

The local Traverse checkout still pins `traverse-registry = 0.19.0`, so this is
the expected pre-upgrade failure rather than a Callweave contract failure.

The implementation handoff is tracked in [Traverse Project 1](https://github.com/orgs/traverse-framework/projects/1?pane=issue&itemId=PVTI_lADOEbiBt84BcZQJzg6K4ZA),
item **Consume traverse-registry 0.20.0 for manifest-scoped Registry
preparation**.
