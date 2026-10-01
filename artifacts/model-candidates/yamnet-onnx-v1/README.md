# YAMNet ONNX evaluation artifact

Status: evaluation-only; not yet a Traverse WASM package or production model
dependency.

- Upstream model: Google YAMNet v1 (`google/yamnet` / TF Hub SavedModel)
- Conversion source: `audiomagic/yamnet-onnx`, revision `f25b741`
- Model artifact: `yamnet.onnx`
- Artifact SHA-256: `sha256:d3835ffbbd4a1bb3e777f0ca217b5007907f5171dd5d17c4236b95b2af8f908e`
- Class map SHA-256: `sha256:cdf24d193e196d9e95912a2667051ae203e92a2ba09449218ccb40ef787c6df2`
- Model license: Apache-2.0
- Ontology/labels: AudioSet, CC-BY-4.0
- Input: mono float32 PCM, 16 kHz, nominal range [-1, 1]
- Outputs: 521 AudioSet scores, 1024-dimensional embeddings, log-mel patches
- Role: broad sound-event gate; not a species identifier

The source repository documents a direct ONNX conversion with no retraining,
fine-tuning, pruning, or quantization. The package must retain the Apache
license, AudioSet attribution, conversion provenance, and class-map terms.

Promotion requires ONNX-to-WASM conversion, exact Traverse guest-ABI tests,
resource measurements, signed Spec 138 manifest, and browser conformance.
