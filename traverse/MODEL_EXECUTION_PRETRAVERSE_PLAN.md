# Model execution pre-Traverse plan

This slice prepares all model-execution business logic without requiring the
Traverse runtime model-invocation ABI and without selecting or downloading a
production model.

## Completed in Callweave

- `model-artifact-manifest-validate`: validates digest, license, ABI, schemas,
  target profiles, and resource limits.
- `model-inference-request-validate`: validates exact model references,
  bounded byte payloads, input schema, target, and timeout ceilings.
- `model-inference-response-normalize`: normalizes success and stable failure
  statuses into one provider-neutral envelope.
- `model-compatibility-evaluate`: evaluates target, schema, and memory
  compatibility without executing a model.
- `model-artifact-policy-evaluate`: evaluates signature, license, and memory
  policy without downloading or activating an artifact.
- Deterministic happy/unhappy fixtures are integrated into the pure capability
  suite; 24 fixtures and the business-logic smoke suite pass.

## Next implementation steps

1. Add Traverse governing spec/ADR for the model manifest and invocation
   envelope using `traverse/MODEL_EXECUTION_SLICE_REQUEST.md`.
2. Map these pure contracts to the final Traverse WIT/ABI once the runtime
   surface is approved.
3. Build a tiny synthetic CPU-WASM executor fixture (no ML weights) to test
   request/response conformance and resource failures.
4. Add cross-target normalized-response tests for browser and native adapters.
5. Create a model-artifact candidate evaluation record for any real model only
   after explicit license, redistribution, digest, ABI, and memory approval.
6. Publish the pure validators/normalizers to the Registry as generic
   capabilities if maintainers accept them as reusable primitives.
7. After Traverse runtime support lands, implement resolver/cache/execution
   integration and update the application manifest.

## Blocked until Traverse

- Actual model loading and execution;
- content-addressed model provisioning/cache;
- mediated WASM-to-model invocation;
- browser/native acceleration adapters;
- runtime trace/resource evidence from real model execution.

## Model-selection guardrail

No production model is selected in this plan. A candidate must carry an
auditable license, redistribution permission, immutable digest, ABI/schema
compatibility, benchmark evidence, and target-specific memory limits before it
can be added to the application manifest.
