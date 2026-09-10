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

For location-aware candidate scoring, pass a profile explicitly:

```bash
npm run analyze:audio -- path/to/recording.mp3 output \
  --candidates config/locations/golden-bc.json
```

The command decodes WAV/FLAC audio locally, resamples it for BirdNET (48 kHz,
3-second windows) and Perch (32 kHz, 5-second windows), and writes:

- `<recording>.evidence.json`: ranked raw model logits with exact time ranges;
- `<recording>.unknown-review.md`: an evidence summary; and
- `<recording>.unknown-review.zip`: those two safe-to-share metadata files.

The analyzer never treats a model result as a verified animal observation. Its
JSON includes `classification.status: "unknown"` and
`reason: "uncalibrated_model_ranking"` until a versioned calibration policy and
human confirmation are supplied. Its scores are uncalibrated ranking evidence,
and location/season candidate policy
must be applied before any governed detection resolution. Raw audio is excluded
from the review ZIP and external LMM review remains blocked until a local
speech/privacy protection capability is available.

The committed evaluation corpus can be checked and replayed with:

```bash
npm run sound-samples:validate
npm run sound-samples:evaluate
```

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
eighteen standalone executable WASM capabilities already present in this repo
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

## Traverse compatible test apps

A host-integrated compatible-mode Traverse test app now also lives in
[`apps/callweave-audio-source-configure`](apps/callweave-audio-source-configure).
It exercises the registration path for `callweave.audio-source-configure`
without pretending that real microphone capture is fully implemented.

Generate and verify it with:

```bash
npm run audio-source-configure:compatible:smoke
npm run traverse:audio-source:generate
npm run traverse:audio-source:validate
npm run traverse:audio-source:register
```

A second compatible-mode test app now lives in
[`apps/callweave-model-manage`](apps/callweave-model-manage). It exercises the
registration path for `callweave.model-manage` without embedding provider or
download logic into the wrapper.

```bash
npm run model-manage:compatible:smoke
npm run traverse:model-manage:generate
npm run traverse:model-manage:validate
npm run traverse:model-manage:register
```

A third compatible-mode test app now lives in
[`apps/callweave-acoustics-classify`](apps/callweave-acoustics-classify). It
exercises the registration path for `callweave.acoustics-classify` without
claiming real inference runs inside the wrapper.

```bash
npm run acoustics-classify:compatible:smoke
npm run traverse:acoustics-classify:generate
npm run traverse:acoustics-classify:validate
npm run traverse:acoustics-classify:register
```

A fourth compatible-mode test app now lives in
[`apps/callweave-privacy-protect`](apps/callweave-privacy-protect). It
exercises the registration path for `callweave.privacy-protect` without
claiming real privacy detection or export logic inside the wrapper.

```bash
npm run privacy-protect:compatible:smoke
npm run traverse:privacy-protect:generate
npm run traverse:privacy-protect:validate
npm run traverse:privacy-protect:register
```

A fifth compatible-mode test app now lives in
[`apps/callweave-audio-capture`](apps/callweave-audio-capture). It exercises
the registration path for `callweave.audio-capture` without claiming real
capture execution inside the wrapper.

```bash
npm run audio-capture:compatible:smoke
npm run traverse:audio-capture:generate
npm run traverse:audio-capture:validate
npm run traverse:audio-capture:register
```

A sixth compatible-mode test app now lives in
[`apps/callweave-daily-close`](apps/callweave-daily-close). It exercises the
registration path for `callweave.daily-close` without claiming real scheduler
or durable close-record execution inside the wrapper.

```bash
npm run daily-close:compatible:smoke
npm run traverse:daily-close:generate
npm run traverse:daily-close:validate
npm run traverse:daily-close:register
```

A seventh compatible-mode test app now lives in
[`apps/callweave-daily-revise`](apps/callweave-daily-revise). It exercises the
registration path for `callweave.daily-revise` without claiming real artifact
rendering or revision persistence inside the wrapper.

```bash
npm run daily-revise:compatible:smoke
npm run traverse:daily-revise:generate
npm run traverse:daily-revise:validate
npm run traverse:daily-revise:register
```

An eighth compatible-mode test app now lives in
[`apps/callweave-daily-create`](apps/callweave-daily-create). It exercises the
registration path for `callweave.daily-create` without claiming real canvas
rendering or publication persistence inside the wrapper.

```bash
npm run daily-create:compatible:smoke
npm run traverse:daily-create:generate
npm run traverse:daily-create:validate
npm run traverse:daily-create:register
```

A ninth compatible-mode test app now lives in
[`apps/callweave-evidence-retain`](apps/callweave-evidence-retain). It
exercises the registration path for `callweave.evidence-retain` without
claiming real lifecycle deletion or storage mutation outside the declared
wrapper boundary.

```bash
npm run evidence-retain:compatible:smoke
npm run traverse:evidence-retain:generate
npm run traverse:evidence-retain:validate
npm run traverse:evidence-retain:register
```

A tenth compatible-mode test app now lives in
[`apps/callweave-observation-manage`](apps/callweave-observation-manage). It
exercises the registration path for `callweave.observation-manage` without
claiming direct durable history mutation outside the declared wrapper
boundary.

```bash
npm run observation-manage:compatible:smoke
npm run traverse:observation-manage:generate
npm run traverse:observation-manage:validate
npm run traverse:observation-manage:register
```

An eleventh compatible-mode test app now lives in
[`apps/callweave-knowledge-manage`](apps/callweave-knowledge-manage). It
exercises the registration path for `callweave.knowledge-manage` without
claiming direct durable knowledge promotion outside the declared wrapper
boundary.

```bash
npm run knowledge-manage:compatible:smoke
npm run traverse:knowledge-manage:generate
npm run traverse:knowledge-manage:validate
npm run traverse:knowledge-manage:register
```

A twelfth compatible-mode test app now lives in
[`apps/callweave-unknown-organize`](apps/callweave-unknown-organize). It
exercises the registration path for `callweave.unknown-organize` without
claiming direct local cluster persistence outside the declared wrapper
boundary.

```bash
npm run unknown-organize:compatible:smoke
npm run traverse:unknown-organize:generate
npm run traverse:unknown-organize:validate
npm run traverse:unknown-organize:register
```

A thirteenth compatible-mode test app now lives in
[`apps/callweave-coverage-assess`](apps/callweave-coverage-assess). It
exercises the registration path for `callweave.coverage-assess` without
claiming direct durable coverage persistence outside the declared wrapper
boundary.

```bash
npm run coverage-assess:compatible:smoke
npm run traverse:coverage-assess:generate
npm run traverse:coverage-assess:validate
npm run traverse:coverage-assess:register
```
