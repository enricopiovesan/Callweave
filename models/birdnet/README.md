# BirdNET ONNX readiness harness

The pinned local baseline is **BirdNET v2.4 GLOBAL 6K ARM INT8 ONNX**. Its
precise source revision, checksum, interface, and licence conditions are in
[`MODEL_LOCK.json`](MODEL_LOCK.json). The model binary remains intentionally
untracked; retrieve exactly the pinned artifact, name it `birdnet.onnx`, and
verify it before use:

```bash
shasum -a 256 models/birdnet/birdnet.onnx
```

This model is licensed **CC BY-NC-SA 4.0**. Callweave must retain the bundled
BirdNET attribution and may not use or redistribute this model commercially
without separate authorization.

Run the local readiness check:

```bash
npm run birdnet:readiness -- models/birdnet/birdnet.onnx
```

The harness uses a zeroed three-second 48 kHz mono buffer. It proves only
local ONNX Runtime Web WASM loading, input shape compatibility, and one
inference. It does not identify animals, capture audio, or establish biological
truth. This is a bird-only baseline: mammals, amphibians, insects, bats, and
unknown sounds require separately pinned local models and evaluation data.
