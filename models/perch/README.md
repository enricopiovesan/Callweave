# Perch v2 ONNX baseline

This optional model broadens local acoustic evidence beyond birds to some frogs,
crickets, grasshoppers, and mammals. It is not an all-animal guarantee and it
does not cover ultrasonic bat analysis.

The exact artifact, revision, checksum, interface, resource profile, and
attribution are locked in [`MODEL_LOCK.json`](MODEL_LOCK.json). The untracked
`perch.onnx` binary must match that lock file before it is used.

The pinned labels file contains one `inat2024_fsd50k` header followed by
14,795 class labels. The model output has 14,795 scores, so consumers must
strip that header before mapping scores to species.

Run the readiness harness with:

```bash
npm run perch:readiness -- models/perch/perch.onnx
```

The ARM INT8 model expects mono 32 kHz five-second windows and its published
peak RAM profile is about 292 MB. It is Apache-2.0, but retained attribution
and notices remain required.
