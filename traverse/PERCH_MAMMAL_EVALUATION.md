# Perch 2.0 frozen mammal evaluation

Date: 2026-11-13

## Finding

Perch 2.0 is the strongest frozen pretrained candidate found so far, but it is
not yet a ready Callweave browser package.

- The official Google source is Apache-2.0.
- The published classifier has roughly 14,795 labels and includes relevant
  taxa such as `Cervus canadensis`, `Cervus elaphus`, `Puma concolor`,
  `Ursus americanus`, `Ursus arctos`, and several `Vulpes` species.
- The official model artifact is approximately 409 MB FP32. Public converted
  variants report approximately 205 MB FP16 and 105 MB dynamic-INT8.
- The official release instructions currently target TensorFlow/GPU workflows;
  the smaller converted variants are third-party artifacts and require their
  own provenance, digest, and license review.
- The classifier is broad and bird-heavy. Label presence is not evidence that
  a Golden mammal is detected reliably in field recordings.

## Decision

Do not publish or activate a Perch package yet. Do not train a new head.

The next valid evaluation is a frozen-artifact benchmark using an exact,
publicly identified Perch variant:

1. verify the artifact source, license, conversion revision, and digest;
2. run CPU inference on the supplied elk, bear, and forest recordings;
3. measure memory, latency, and output stability;
4. retain raw logits and mark species results as uncalibrated evidence;
5. reject the package if the target runtime cannot enforce its resource limits.

## Traverse package preflight result

The pinned artifact was also submitted to Traverse's generic ONNX packaging
path using the CPU-WASM runner. Packaging failed closed during the required
Wasmtime `model_prepare` preflight with:

```json
{"engine":"wasmtime","stage":"preflight","error":{"code":"execution_failed","message":"model_prepare trapped, ran out of fuel, or returned non-zero"}}
```

No manifest, signature, or executable package was promoted from this run. This
is an additional runtime-compatibility failure, independent of the weak
mammal ranking results and the unresolved converted-artifact rights review.
The current limits were not relaxed to force the model through.

### Regional-slice follow-up (2026-11-13)

The official `tphakala/Perch-v2-Models` revision
`bbf0d014072919ef6e0d962b3a11c663e5e6b703` publishes a Canada/Alaska slice,
which is a materially better packaging candidate than the full model:

| Artifact | Size | SHA-256 | External runtime | Traverse preflight |
|---|---:|---|---|---|
| `regional/canada-alaska/perch_v2_canada-alaska_int8_arm.onnx` | 46,576,403 bytes | `4a7f3f9946ece497f906621f0383f589cf878595ea938099163ab71e069c2cf5` | not promoted | fails during `model_execute` on Wasmi (`execution_failed`) |
| `regional/canada-alaska/perch_v2_canada-alaska_no_dft_fp32.onnx` | 73,092,700 bytes | `d0cb954c79fd6d1c130c4979c8aec72be09b22b3e7fd6056fbbde5d8ff869ebb` | ONNX Runtime Web loads and evaluates | fails during `model_prepare` on Wasmi (`execution_failed`) |

The regional graphs were tested both with their four declared outputs and as a
label-only graph (`inputs` → `label`). The multi-output manifest is supported by
the current Traverse runner, so this is not a single-output manifest bug. The
label-only INT8 graph passes preparation but exhausts the current 50-billion
fuel ceiling during execution. Increasing the declared package limit above that
ceiling is correctly rejected by the host as `host_limit_exceeded`.

The result is a precise compatibility boundary: the artifact is valid ONNX and
works in ONNX Runtime Web, but it is not currently a portable Traverse WASM
model under the enforced CPU/fuel budget. No model package, signature, or
registry publication was created from these experiments.

## INT8 evaluation result

The public `tphakala/Perch-v2-Models` INT8 ONNX artifact was evaluated outside
the repository:

- artifact: `full/perch_v2_int8_arm.onnx`
- size: 125 MB on disk
- SHA-256: `ff32ca8c57954a86e6023a915d018dc7573cfc5567dd7314891d947cc6d5c5`
- runtime: `onnxruntime-web` WASM
- output: 14,795-class logits, 1,536-dimensional embedding, spatial embedding,
  and spectrogram
- latency: approximately 200–320 ms per 5-second window on the development
  machine

On the supplied elk, black-bear, grizzly-bear, cougar, creek, and forest
recordings, the top results were predominantly unrelated birds, insects,
frogs, or generic noise. The model therefore fails the current mammal
promotion bar. This is a model/domain result, not evidence that the animals
are absent from the recordings.

## Current recommendation

Keep Perch as one evidence source in a multi-model ensemble, not the sole
Callweave mammal recognizer. Keep YAMNet as the small broad-event gate and use
Perch embeddings for reference matching where appropriate. The honest current
fallback is broad event detection plus `unknown`, not a fabricated mammal
classifier. A future frozen mammal model must beat these negative results on
rights-cleared field recordings before promotion.
