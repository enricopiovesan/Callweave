# Traverse request: governed ONNX Runtime WASM model backend

Status: requested implementation slice
Date: 2026-11-13

## Problem

Callweave has a legally reviewable Perch Canada/Alaska ONNX artifact and it
executes in ONNX Runtime Web. It does not execute within Traverse's current
`tract-onnx` runner under the enforced portable WASM budget:

- regional INT8 label-only graph: preparation succeeds, execution exhausts the
  50-billion fuel ceiling;
- regional FP32 graph: preparation fails under the Wasmi preflight;
- declaring a larger fuel limit is correctly rejected by the host as
  `host_limit_exceeded`.

This is a runner/backend compatibility boundary, not a Callweave workflow or
UI problem. The model must remain evaluation-only until a governed backend can
execute it.

## Request

Add an optional ONNX Runtime WASM backend to Traverse's existing Spec 138 model
execution surface. It must be a provider implementation behind the existing
provider-neutral model invocation contract. Downstream capabilities and
applications must not import ONNX Runtime APIs directly.

The first implementation may target the browser/WASM placement. Native hosts
must report `model_incompatible` until they provide the same governed backend;
they must not silently fall back to an ungoverned host model.

## Required design

### Backend boundary

- Reuse the existing signed model manifest, exact digest pin, model resolver,
  cache, request/response envelope, and trace evidence.
- Add a declared executable/backend profile, for example
  `onnxruntime-wasm-cpu`.
- Keep the public operation provider-neutral (`model_invoke` or the existing
  equivalent).
- Select the backend only through Traverse placement policy.
- Preserve the same normalized statuses, schemas, cancellation, deadlines,
  and resource evidence as the current runner.

### Model packaging

- Define whether the ORT WASM runtime is a signed shared runner artifact or a
  per-model package variant. Prefer one audited runner plus immutable model
  data when possible.
- Pin the exact ONNX Runtime WASM binary, build flags, source revision, and
  license notices.
- Record runtime and model digests independently.
- Reject a package if its backend profile, ONNX opset, tensor names, shapes,
  dtypes, or resource limits are missing or inconsistent.

### Security and limits

- No network, filesystem, dynamic code loading, or arbitrary host imports.
- Enforce package bytes, linear memory, output bytes, wall time, cancellation,
  and worker termination.
- If instruction-level fuel is unavailable in ONNX Runtime WASM, use a bounded
  wall-time/worker budget and document the security trade-off. Do not claim
  fuel enforcement that the backend cannot provide.
- Prevent a model from selecting a different model, downloading artifacts, or
  changing the backend policy.
- Redact audio/tensor payloads from traces.

## Required conformance fixture

Use the pinned Perch regional label-only graph as an evaluation fixture only:

- source revision:
  `tphakala/Perch-v2-Models@bbf0d014072919ef6e0d962b3a11c663e5e6b703`;
- artifact:
  `regional/canada-alaska/perch_v2_canada-alaska_int8_arm.onnx`;
- SHA-256:
  `4a7f3f9946ece497f906621f0383f589cf878595ea938099163ab71e069c2cf5`;
- input: one `[1,160000]` float32 tensor;
- output: one `[1,962]` float32 label tensor.

The fixture is not a production approval. Its model rights, labels, and
attribution remain subject to the separate model approval record.

## Required tests

### Happy paths

- exact signed model resolves to the ORT WASM backend;
- the Perch fixture executes in a browser Worker;
- bounded input produces the declared output shape and dtype;
- warm-cache offline execution succeeds;
- output normalization matches the provider-neutral envelope;
- cancellation terminates the Worker and returns `cancelled`;
- deadline returns `timeout` without leaving a live execution;
- trace contains model digest, backend profile, placement, elapsed time, and
  redacted resource evidence.

### Unhappy paths

- unsupported ONNX opset or operator;
- missing or mismatched runtime digest;
- model digest/signature mismatch;
- package, memory, output, or wall-time limit exceeded;
- malformed tensor frame, wrong dtype, wrong shape, or oversized input;
- cache miss during offline execution;
- attempted network or filesystem access;
- Worker crash or backend initialization failure;
- native placement without an ORT backend;
- duplicate/unknown manifest fields and missing rights metadata.

### Cross-target checks

- browser Worker and browser inline mode return the same normalized result;
- native hosts either execute the same backend or return explicit
  `model_incompatible` evidence;
- no application capability imports ONNX Runtime directly;
- existing tract runner fixtures remain green.

## Definition of Done

- governing Traverse spec/ADR approved for the backend profile and security
  trade-offs;
- versioned backend contract documented;
- exact runtime and model digests verified before execution;
- browser ORT WASM backend passes the full conformance suite;
- cancellation and timeout terminate execution deterministically;
- resource limits are enforced or explicitly reported as unsupported;
- signed model binding works through the existing application manifest;
- model traces are redacted and auditable;
- CI covers browser/WASM, supply-chain, license, and cross-runner checks;
- the Perch package is publishable only after rights approval and a passing
  backend conformance report;
- no Callweave-specific API or workflow logic is added to Traverse.

## Explicit non-goals

- changing Callweave UI or microphone handling;
- changing the Registry model-rights policy;
- making Perch the default animal recognizer;
- bypassing Traverse signatures, exact references, or resource limits;
- adding a native host-only model fallback.
