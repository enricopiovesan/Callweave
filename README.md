# Callweave

Local-first audible wildlife evidence and daily-art foundations. Golden, BC is
the first location profile; no capability is hard-coded to it.

## Run the offline audible analyzer

After placing the checksum-verified untracked model binaries at
`models/birdnet/birdnet.onnx` and `models/perch/perch.onnx`:

```bash
npm install
npm run analyze:audio -- path/to/recording.flac output
```

The command decodes WAV/FLAC audio locally, resamples it for BirdNET (48 kHz,
3-second windows) and Perch (32 kHz, 5-second windows), and writes:

- `<recording>.evidence.json`: ranked raw model logits with exact time ranges;
- `<recording>.unknown-review.md`: an evidence summary; and
- `<recording>.unknown-review.zip`: those two safe-to-share metadata files.

The analyzer never treats a model result as a verified animal observation. Its
scores are uncalibrated ranking evidence, and location/season candidate policy
must be applied before any governed detection resolution. Raw audio is excluded
from the review ZIP and external LMM review remains blocked until a local
speech/privacy protection capability is available.

## Supported scope

Audible birds, frogs/toads, many insects, and vocal mammals are in scope.
Bats and ultrasonic insects are explicitly out of scope.

See [DECISION_RECORD.md](DECISION_RECORD.md) for the full product and Traverse
architecture record.

## macOS test app

A native SwiftUI macOS developer test app lives in
[`apps/CallweaveMac`](apps/CallweaveMac). It runs the local checks that are
already available in this repo.

## Web test app

A browser test app lives in [`apps/CallweaveWeb`](apps/CallweaveWeb). It runs
the browser-safe checks over the same shared business-logic modules used by
the Node and macOS test surfaces.

## Traverse foundation app bundle

A real Traverse application bundle now lives in
[`apps/callweave-foundation`](apps/callweave-foundation). It packages the
thirteen standalone executable WASM capabilities already present in this repo
into:

- concrete component manifests
- active one-node workflows
- a governed application manifest
- local validation and registration wrappers

Generate and verify it with:

```bash
npm run traverse:foundation:generate
npm run traverse:foundation:validate
npm run traverse:foundation:register
```

This is the first executable Traverse integration path for Callweave. The full
daily local-first Callweave application contracts under `traverse/` still
remain draft until the remaining host-integrated and model-integrated
capabilities have real executable package coverage.
