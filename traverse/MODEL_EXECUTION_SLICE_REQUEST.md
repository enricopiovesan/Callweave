# Traverse request: portable governed model execution

## Context

Callweave’s generic business capabilities are now published and active in the
Traverse Registry. The remaining atomic slice is model execution. UI,
microphone capture, workflow composition, and application presentation are out
of scope.

The target architecture is:

```text
Application manifest
  -> exact signed model reference
  -> Traverse resolver and content-addressed cache
  -> bounded provider-neutral model executor
  -> typed inference result and trace evidence
```

The downstream capability must not know whether execution uses a WASM model,
CPU SIMD, WebGPU, Metal, or another host adapter. Provider choice belongs to
Traverse runtime policy.

## Request

Add a public, portable Traverse runtime surface for a governed WASM capability
to invoke an exact, signed model dependency through a bounded inference
request/response envelope.

The first conformance implementation MUST use CPU-only WASM execution. Runtime
acceleration adapters may be added later without changing the public contract.

## Required model artifact manifest

Define a versioned manifest for every executable model artifact containing:

- `model_id` and semantic `version`;
- immutable content `digest` and Registry reference;
- executable format and ABI version;
- input schema references and output schema references;
- license identifier, attribution, and redistribution terms;
- supported target profiles (`wasm32-wasi`, browser, native, etc.);
- maximum linear memory, fuel/instruction, input bytes, output bytes, and
  execution time;
- optional quantization and numeric precision metadata;
- provenance/source revision and build reproducibility evidence;
- whether the artifact is allowed to execute offline after provisioning.

The manifest MUST reject missing license, digest, ABI, schema, or resource
limits. A model URL alone is never an acceptable model identity.

## Inference request envelope

Define a stable versioned request envelope with:

- exact `model_ref` (`model_id`, version, digest);
- `input_schema_ref` and schema version;
- bounded binary tensor/feature payloads (no unbounded JSON base64);
- JSON metadata for shape, dtype, layout, sample rate, channel count, and
  application correlation IDs;
- per-call memory, fuel, timeout, and output-size ceilings, each bounded by
  the model manifest and runtime policy;
- cancellation/deadline information;
- privacy/data classification metadata;
- idempotency/correlation key where the caller may retry.

The envelope MUST be deterministic to serialize and validate. Unknown fields
must fail closed or be explicitly ignored by a declared compatibility policy.

## Inference response envelope

Return:

- `status`: `ok`, `invalid_input`, `model_unavailable`, `model_incompatible`,
  `resource_exhausted`, `cancelled`, `timeout`, or `execution_failed`;
- typed output payload and `output_schema_ref` on success;
- exact selected model identity and digest;
- placement/executor profile (`wasm-cpu` initially);
- trace ID and redacted execution evidence;
- measured resource usage (input/output bytes, memory peak, fuel/time where
  available);
- stable reason code and safe diagnostic message on failure;
- whether the failure is retryable.

The response MUST never expose provider credentials, arbitrary host paths,
private URLs, or internal runtime details.

## Resolver and cache behavior

Traverse MUST:

1. resolve only exact model references declared by the application manifest;
2. verify Registry signature and content digest before execution;
3. use a content-addressed cache keyed by digest, not by mutable URL;
4. support offline execution when the verified artifact is already provisioned;
5. return stable `model_unavailable` or `model_incompatible` evidence when the
   artifact is absent or unsupported;
6. prevent a capability from downloading, replacing, or selecting a model;
7. make cache eviction and provisioning host-controlled and observable;
8. avoid network calls during offline validation, registration, or execution.

Model download/provisioning is a host/runtime operation. It is not performed
by the WASM capability.

## WASM and host boundary

Expose one provider-neutral runtime operation, for example:

```text
model_invoke(request_bytes) -> response_bytes
```

The operation MUST be available through the governed Traverse host boundary,
not through provider-specific imports. It MUST enforce:

- capability and model sandbox separation;
- memory, fuel, timeout, output, and cancellation limits;
- deny-by-default filesystem and network access;
- explicit target/profile negotiation;
- trace and provenance propagation;
- no ambient authority from the calling capability.

The same envelope MUST work for browser and native embedders. Browser and
native adapters may differ internally, but differences must be reported as
placement metadata rather than changing business logic.

## Portability requirements

The conformance baseline MUST run on `wasm32-wasi` with CPU-only execution and
no provider-specific host dependency. SIMD, WebGPU, Metal, Core ML, and native
ML engines are optional adapters. They MUST:

- be selected by Traverse policy;
- preserve the same request/response schemas;
- respect the same limits and failure codes;
- be independently capability-detected;
- fall back or fail explicitly without silently changing semantics.

The design MUST account for browser memory ceilings, native larger caches,
endianness, floating-point precision, deterministic serialization, and model
quantization. Large models MUST be allowed to declare that a target is
unsupported rather than causing an OOM or silent degradation.

## Security and governance

- No model artifact may execute without a verified digest and signature.
- License and redistribution terms are mandatory metadata.
- Model artifacts are untrusted inputs and execute under resource limits.
- Network and filesystem access are denied by default.
- Traces redact input content and credentials.
- Exact model selection is auditable from application manifest to response.
- No model should be selected for Callweave until license, redistribution,
  digest, ABI, benchmark, and memory evidence are separately approved.

## Compatibility with existing Traverse work

Reuse and integrate with existing:

- Registry exact-version resolution and signed artifact verification;
- application bundle manifests and connector bindings;
- `runtime.wasm` orchestration and WASM capability execution;
- mediated connector invocation and placement/resource policy;
- model dependency declarations and existing runtime trace evidence.

Do not introduce a second provider registry, application-specific model API,
or Callweave-specific workflow behavior.

## Required tests

Add deterministic conformance fixtures covering:

### Happy paths

- exact signed model resolves and executes on CPU WASM;
- bounded tensor input produces schema-valid output;
- offline execution succeeds with a warm verified cache;
- trace identifies model ID, version, digest, placement, and resource usage;
- optional acceleration reports the same envelope as CPU baseline.

### Unhappy paths

- missing model reference;
- version or digest mismatch;
- invalid/missing license or ABI metadata;
- unsupported input schema, dtype, shape, or target profile;
- signature or digest failure;
- cache miss in offline mode;
- input/output/memory/fuel/time limit exceeded;
- cancellation and timeout;
- malformed binary payload and duplicate/unknown JSON keys;
- model execution trap or provider failure;
- attempted network/filesystem access;
- retry behavior for retryable versus non-retryable failures.

Run the fixtures against browser and native embedders and compare normalized
responses and redacted traces.

## Definition of Done

- Approved governing spec and ADR define the model manifest and invocation
  envelope.
- Public WIT/ABI or equivalent runtime API is documented and versioned.
- Exact signed model resolution and digest verification are implemented.
- Content-addressed cache and offline behavior are implemented and tested.
- CPU-only WASM execution passes the full conformance suite.
- Resource, cancellation, and sandbox limits are enforced.
- Browser and native adapters pass cross-target normalized-output tests.
- Missing/incompatible model failures are stable and auditable.
- No provider-specific API is exposed to downstream capabilities.
- Security, license, provenance, and reproducibility evidence is recorded.
- CI passes formatting, unit, integration, WASM, coverage, portability, and
  supply-chain checks.
- A signed runtime artifact and an example model fixture are published.
- Downstream Callweave can invoke the service using only an application
  manifest model reference; no local fallback or host model is used.

## Explicit non-goals

- Selecting a production animal-recognition model;
- downloading or licensing model weights;
- microphone capture or audio codecs;
- UI, native presentation, or browser UX;
- Callweave workflow composition;
- provider-specific APIs or cloud LMM transport;
- automatic model training, fine-tuning, or evaluation claims.

## Requested Traverse deliverables

Please respond with:

1. the governing spec/ADR and implementation ticket;
2. the selected public invocation surface and compatibility policy;
3. the model manifest schema and example fixture;
4. the cache/provisioning and offline trust-boundary design;
5. the CPU-WASM conformance results and cross-target comparison report;
6. any remaining portability or runtime gaps that block downstream adoption.
