# Silero VAD privacy baseline

This is a local **speech-risk** detector for Callweave review-package privacy
gating. The exact ONNX artifact and MIT licence are pinned in
[`MODEL_LOCK.json`](MODEL_LOCK.json); the ONNX binary remains untracked.

Run its local WASM check with:

```bash
npm run silero-vad:readiness
```

Passing this readiness check does **not** make raw audio export safe. VAD can
miss speech in noisy outdoor recordings, so Callweave stays fail-closed until a
location-relevant privacy evaluation and explicit policy approval exist.
