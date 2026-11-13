# BirdNET V2.4 → Traverse WASM conversion

Status: evaluation package converted and cross-engine conformance passed; not
approved for redistribution or production activation.

## Source artifact

- Release: BirdNET V2.4
- Source: <https://zenodo.org/records/15050749>
- File: `BirdNET_v2.4_tflite_int8.zip`
- Archive size: 45,948,867 bytes
- MD5: `69becc3e8eb1c72d1d9dae7f21062c74`
- SHA-256: `48664fe911164d42ab8a5da77f285f69de5077fd15b580de59bf8220688a154f`
- Model license: CC BY-NC-SA 4.0
- Contents: INT8 audio model, metadata model, and localized labels

The archive is staged outside Git for evaluation. No model binary is committed
to the repository yet.

## Converted evaluation package

Traverse already documents and tests the exact ONNX export used for BirdNET
V2.4. The immutable source is `tphakala/BirdNET-v2.4@d016ed1`:

- source ONNX SHA-256: `6a2323fe8f99c2af4bb325cf8f11b52748a86aa1f2c9e706c1ae7f907289521a`;
- Traverse runner SHA-256: `ac5591fac5f37435667169e969f9117cc6f81dc66b73cd74d1aef9000f5d3a0a`;
- generated WASM SHA-256: `e566cf051ca0c811b4c75e71521bd481a207956cb740146d6af5177d4a83bc92`;
- generated manifest SHA-256: `952390542e5206a9e48486d4c3f1bf15bf5c12e9a90d1734f7e448077d1cc597`;
- package location: `/private/tmp/callweave-birdnet-v2.4-onnx/package`;
- rights: `CC-BY-NC-SA-4.0`, `commercial_use: prohibited`;
- signature: Traverse test-only key, never a production trust anchor.

The package was verified by Traverse with the non-commercial usage policy and
its one-case deterministic conformance vector passed on both Wasmtime and
Wasmi. The model binary and signature remain outside Git because this is an
evaluation-only, non-commercial package.

## Required conversion boundary

Traverse cannot execute the TFLite archive directly. The final package must be
a signed `traverse-model-wasm` guest with:

1. an explicit waveform input schema and score/embedding output schema;
2. deterministic preprocessing matching BirdNET V2.4 (32 kHz, short windows,
   spectrogram frontend, and the selected label vocabulary);
3. numerical parity against the official TFLite reference;
4. bounded WASM memory, fuel, input, output, and execution-time limits;
5. cancellation/deadline behavior through Traverse 0.17;
6. exact manifest and WASM digests, rights/attribution metadata, and an Ed25519
   signature;
7. browser and native conformance vectors.

## Conversion options

### Preferred

Use an official BirdNET ONNX export if the exact release and model license are
available, then package it through Traverse's ONNX-to-WASM path. This avoids
embedding a TFLite interpreter in every guest.

### Fallback

Compile a compatible TFLite/LiteRT interpreter into the Traverse WASM guest and
embed the INT8 model. This is larger and requires a separate audit of operator
coverage, memory use, cancellation, and license notices.

### Rejected shortcut

Running TFLite or TensorFlow.js in the host/browser is not acceptable: it would
move model execution outside the Traverse WASM runtime and violate the
application portability requirement.

## Remaining promotion gates

BirdNET remains `evaluation_only` until a human approves the exact package and
distribution terms, a protected Callweave signing key is provisioned, the
held-out field/negative-control evaluation is recorded, and the package is
registered and pinned through the target Traverse Registry workflow. The
conversion itself is no longer the blocker.
