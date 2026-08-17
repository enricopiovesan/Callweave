# BirdNET ONNX readiness harness

Place a licensed BirdNET v2.4 ONNX classifier here as `birdnet.onnx`, then run:

```bash
npm run birdnet:readiness -- models/birdnet/birdnet.onnx
```

The harness uses a zeroed three-second 48 kHz mono buffer. It proves only
local ONNX Runtime Web WASM loading, input shape compatibility, and one
inference. It does not identify animals, capture audio, download models, or
claim a model licence. Record model hash, licence, label set, CPU/memory, and
Golden BC evaluation results before making it a Callweave configuration.
