# Request to Traverse Registry: model-license compliance contract

## Ask

Implement and document a Registry contract for every published model package.
The contract must preserve the model's actual legal terms and make them
machine-readable, inspectable, and enforceable by consuming runtimes.

For every immutable model version, require:

- SPDX license identifier or an explicit custom-license record;
- full license URL and, where redistribution requires it, the license text;
- attribution and NOTICE content;
- immutable source URL and source revision;
- artifact digest and package version;
- redistribution status;
- commercial-use status;
- derivative/conversion status;
- training-data and label-data obligations when supplied by the publisher;
- signing key identity and signature evidence;
- package status: verified, evaluation-only, deprecated, or revoked.

The Registry must not broaden rights from a source claim and must not mark
rights as approved when the evidence is missing or ambiguous.

## Required validation

Registry CI must fail when:

1. a required rights field is missing or malformed;
2. a non-SPDX license lacks a custom license URL and explanation;
3. attribution or required NOTICE content is absent;
4. the artifact digest does not match the published package;
5. source revision or provenance is mutable or absent;
6. commercial-use or redistribution status is `unknown` for an executable package;
7. a converted artifact does not identify its upstream model and changes;
8. a new version silently changes rights for an existing immutable version;
9. a revoked or deprecated package remains discoverable as active;
10. the generated catalog/index drops any rights field.

## Verification evidence

The Registry implementation must provide:

- schema tests for permissive, non-commercial, restricted, evaluation-only,
  deprecated, and revoked packages;
- negative tests for missing, contradictory, and unknown rights;
- digest/signature verification tests;
- catalog/index round-trip tests proving rights are preserved;
- CLI/API inspection output showing the complete rights record;
- an example package containing LICENSE, NOTICE, attribution, provenance, and
  conversion metadata;
- documentation describing publisher and consumer obligations.

## Acceptance

The work is complete only when the approved specification, CI gates, catalog,
CLI/API inspection, and published crate all enforce the same contract.
Existing immutable packages may be backfilled separately, but new versions
must not bypass these requirements.
