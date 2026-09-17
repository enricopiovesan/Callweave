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

The probe intentionally exports the model stage only. Its input is a normalized
`[batch, 1024, 128]` log-mel tensor. Audio decoding, resampling, mel extraction,
normalization, thresholding, and evidence shaping remain separate capabilities so
the model contract stays reusable across targets.

## Decision and next work

The model is technically portable, but the FP32 artifact is too large to treat as
the default browser/WASM package. The next bounded work item is:

1. export an INT8 (or other supported) ONNX variant with calibration data;
2. run parity and accuracy checks against the FP32 reference;
3. benchmark memory, fuel, latency, and cancellation under Traverse's exact-model
   execution contract on CPU-WASM;
4. create a Spec 138 manifest containing the exact digest, schema/ABI versions,
   limits, license, attribution, and offline policy;
5. publish only after the artifact and rights review is approved.

Until those steps pass, keep Nocturne marked `evaluation-only` and do not add its
weights or generated ONNX file to Git.
