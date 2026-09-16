# Registry request: machine-readable licensing and usage rights

## Problem

The Registry publishes executable WASM capabilities, but consumers cannot
reliably discover from the capability index whether an entry may be used or
redistributed commercially. A capability may be permissively licensed while a
bundled or referenced model, dataset, label set, or generated artifact has
more restrictive terms. Treating these as one license creates unsafe and
ambiguous reuse decisions.

The current contract shape identifies an artifact and its digest, but does not
provide a consistent top-level declaration for:

- the capability source/code license;
- the executable artifact license;
- commercial-use permission;
- redistribution permission;
- attribution obligations;
- license evidence and review status.

This is a discoverability and governance gap, not a request for the Registry
to provide legal advice or certify the correctness of a maintainer's claim.

## Ecosystem precedent

npm uses a `license` field with SPDX identifiers or expressions, including
`UNLICENSED` for packages that grant no reuse rights. PyPI is standardizing on
the SPDX-based `License-Expression` field and license files. SPDX defines the
canonical identifiers and expression grammar.

Traverse should reuse SPDX syntax while adding explicit usage-rights fields
needed for executable capabilities and AI/data dependencies.

## Proposed contract metadata

Add an additive `licensing` object to new capability contracts:

```json
"licensing": {
  "code": {
    "spdx_expression": "MIT",
    "license_files": ["LICENSE"]
  },
  "artifact": {
    "spdx_expression": "MIT",
    "redistribution": "allowed"
  },
  "commercial_use": "allowed",
  "attribution_required": true,
  "source_url": "https://github.com/example/project",
  "verification": {
    "status": "maintainer-declared",
    "reviewed_at": "2026-09-16",
    "evidence_url": "https://github.com/example/project/blob/main/LICENSE"
  }
}
```

### Enumerations

`commercial_use`, `artifact.redistribution`, and any future rights field MUST
use one of:

- `allowed`
- `forbidden`
- `conditional`
- `unknown`

`unknown` is explicit uncertainty. Consumers and policy engines MUST NOT
interpret it as allowed.

`verification.status` SHOULD support:

- `maintainer-declared`;
- `registry-reviewed`;
- `verified-with-evidence`.

## Capability versus dependency licensing

The new block applies to the capability implementation and executable artifact
itself. It MUST NOT imply rights for external dependencies.

Model packages remain separately governed by Traverse model-execution metadata,
including model license, attribution, redistribution terms, digest, and
provenance. A capability contract that invokes a model SHOULD declare the
model as an explicit dependency/reference, never silently inherit its rights.

Example: a MIT capability with a CC BY-NC-SA model MUST expose the capability
as `commercial_use: allowed` only if the capability artifact itself is MIT,
while exposing the model dependency as `commercial_use: forbidden` or
`conditional` in its model manifest. Consumers must see both facts.

## Compatibility and migration

1. Existing immutable contracts remain valid and are not rewritten.
2. The field is optional for legacy entries and required for newly published
   capability versions after the policy activation date.
3. Missing legacy metadata is indexed as `unknown`, never as `allowed`.
4. SPDX expressions are validated against the SPDX grammar; custom licenses
   use `LicenseRef-*` plus an evidence URL or checked-in license file.
5. No publication is blocked solely because a license is restrictive; the
   restriction must be visible and machine-readable.
6. Existing artifact signing, digest verification, and lifecycle behavior are
   unchanged.

## Index and discovery behavior

The generated index MUST expose normalized fields sufficient for filtering:

- `commercial_use`;
- `redistribution`;
- `license_expression`;
- `verification_status`.

Search and CLI output SHOULD support filters such as:

```text
registry search --commercial-use allowed
registry search --redistribution allowed
registry inspect capability.id@version --licenses
```

The index MUST preserve the distinction between capability artifact rights and
dependency/model rights.

## Validation and governance requirements

Registry CI MUST:

- validate SPDX expressions and enumerated rights values;
- require the licensing block for new capability versions after activation;
- reject malformed URLs and invalid evidence shapes;
- reject contradictory declarations where a known artifact license forbids
  redistribution but metadata says `redistribution: allowed`;
- ensure generated index values match the contract;
- include licensing metadata in the signed contract bytes and publication
  evidence.

Registry CI MUST NOT attempt to make a legal determination from the license
name alone. Human maintainer review remains responsible for disputed or
ambiguous claims.

## Security and trust considerations

- Licensing metadata is untrusted publisher input until reviewed.
- It is advisory governance metadata, not a replacement for legal review.
- Registry signatures authenticate the published declaration, not the truth of
  the declaration.
- Consumers must be able to enforce a deny-by-default policy for `unknown`,
  `forbidden`, or `conditional` rights.
- No credentials, private URLs, or host paths belong in evidence fields.

## Example capability classifications

| Capability/artifact | Code license | Commercial use | Redistribution | Notes |
| --- | --- | --- | --- | --- |
| Pure Callweave validator | MIT | allowed | allowed | No external model/data dependency |
| BirdNET-backed model package | MIT capability / model terms separate | conditional or forbidden | conditional | Model license must be shown separately |
| Custom permissive model | MIT/Apache-2.0 | allowed | allowed | Only after data provenance is verified |
| Unknown third-party artifact | unknown | unknown | unknown | Must not be treated as reusable |

## Definition of Done

- [ ] A governing Registry specification or amendment is approved.
- [ ] The contract schema defines the additive `licensing` object and enums.
- [ ] SPDX expression validation is implemented and tested.
- [ ] New capability publication requires licensing metadata.
- [ ] Legacy contracts remain valid and index as `unknown` where metadata is
      absent.
- [ ] Generated index exposes commercial-use and redistribution filters.
- [ ] CLI/API inspection returns capability and dependency/model licensing
      separately.
- [ ] Contradictory metadata is rejected by CI.
- [ ] Contract signing covers the licensing declaration.
- [ ] Documentation explains that metadata is declarative, signed, and not a
      legal certification.
- [ ] Fixtures cover allowed, forbidden, conditional, unknown, SPDX expression,
      custom `LicenseRef`, malformed, and contradictory cases.
- [ ] Existing Registry capabilities pass unchanged validation.
- [ ] Migration and release notes document the activation date and consumer
      behavior.

## Requested maintainer response

Please identify:

1. the governing spec/ADR and implementation ticket;
2. whether `licensing` should be required only for new versions or also
   backfilled on existing entries;
3. the canonical enum names and SPDX parser/version to use;
4. whether index and CLI filtering should ship in the same change;
5. any concerns about separating capability rights from model/data rights.

## References

- npm package licensing: https://docs.npmjs.com/files/package.json/
- PyPI core metadata / `License-Expression`:
  https://packaging.python.org/en/latest/specifications/core-metadata/
- SPDX license expressions:
  https://spdx.github.io/spdx-spec/v2.2.2/SPDX-license-expressions/
