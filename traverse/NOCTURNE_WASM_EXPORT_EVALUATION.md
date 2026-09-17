# Nocturne v1.2 Teacher — portable export evaluation

Date: 2026-09-16  
Status: evaluation-only; no production pin or registry publish

## Artifact and rights

- Source: `stratus-labs/nocturne-v1.2-teacher`
- Revision: `4ad0db1214690ee8b21063fa8bf9022a2cbf0f67`
- Local checkpoint: `artifacts/model-candidates/nocturne-v1.2/best.pt`
- SHA-256: `ac3649807a1d52c100bde38d523f257bc4197a4c9433a6d548c032512d5238a7`
- Declared weights license: `CC-BY-4.0`
- Scope: local evaluation only until a complete Spec 138 model manifest, attribution record, and artifact publication review are approved.

## Safe checkpoint inspection

The checkpoint was loaded with `torch.load(..., weights_only=True)` only. It is an
`OrderedDict` containing the complete AST backbone and a 2,196-class multi-label
head; it is not a partial or provider-specific checkpoint. Unsafe pickle loading
was not used.

Observed architecture:

- AST transformer: 12 layers, hidden size 768, 12 attention heads, intermediate size 3072.
- Audio representation: 128 mel bins, 16-frame patches, 10-frame strides, 1,024-frame input.
- Output: 2,196 logits; apply sigmoid and the published per-class thresholds outside the model.

## Portable export probe

The checkpoint was strictly reconstructed with the matching AST configuration and
parameter-name remapping required by the installed Transformers version.

Results:

- strict state-dict load: passed (no missing or unexpected tensors)
- CPU forward probe: passed, output shape `(1, 2196)`, all values finite
- ONNX export (opset 17): passed
- ONNX Runtime CPU probe: passed, output shape `(1, 2196)`, all values finite
- FP32 ONNX size: approximately 335 MB
- FP16 ONNX export: passed; ONNX Runtime CPU probe passed; size approximately 168 MB
- Temporary FP16 probe digest: `70c1325c8a71ae3697a4d314f2bfa8861c169d8494d2e4e03d60a2cf8cf22126`
- Dynamic INT8 probe: not portable with the tested runtime because quantization
  produced `ConvInteger` nodes with no CPU implementation. Do not publish that
  variant without a different quantization strategy and target-runtime test.

The probe intentionally exports the model stage only. Its input is a normalized
`[batch, 1024, 128]` log-mel tensor. Audio decoding, resampling, mel extraction,
normalization, thresholding, and evidence shaping remain separate capabilities so
the model contract stays reusable across targets.

## Decision and next work

## Initial real-audio probe (not an accuracy claim)

The four user-supplied animal clips were decoded with the existing project FFmpeg
path and passed through a developer mel implementation and the strict PyTorch
checkpoint. This is a pipeline smoke test only; the files are marked
`user_supplied_unverified` in the sample manifest.

The expected labels were not recovered in the first ten predictions for the bear,
cougar, and elk clips (the elk clip's top result was `Vulpes vulpes`). This is a
calibration failure, not evidence that those animals are absent. Likely causes to
resolve before any promotion are exact preprocessing parity with the training
code, clip/window selection, and domain mismatch between web audio and field
recordings.

The model is technically portable, but the FP32 artifact is too large to treat as
the default browser/WASM package. The next bounded work item is:

1. evaluate the FP16 candidate first (the only reduced-size variant that passed
   the current CPU runtime);
2. if needed, export an INT8 variant using an operator set supported by the target
   WASM runtime, with calibration data;
3. run parity and accuracy checks against the FP32 reference;
4. benchmark memory, fuel, latency, and cancellation under Traverse's exact-model
   execution contract on CPU-WASM;
5. create a Spec 138 manifest containing the exact digest, schema/ABI versions,
   limits, license, attribution, and offline policy;
6. publish only after the artifact and rights review is approved.

Until those steps pass, keep Nocturne marked `evaluation-only` and do not add its
weights or generated ONNX file to Git.
