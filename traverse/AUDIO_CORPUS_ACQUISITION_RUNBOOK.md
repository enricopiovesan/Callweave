# Audio corpus acquisition runbook

Use this process for every new animal recording.

## Before downloading

1. Select a taxon from `config/test-corpus/audio-source-queue.json`.
2. Prefer a recording with an immutable source URL and a verified `CC0-1.0` or
   `CC-BY-4.0` license.
3. If the source is `CC-BY-NC`, `CC-BY-SA`, or has no clear license, mark it
   `evaluation_only` and do not commit the media to a redistributable corpus.
4. Record source URL, media URL, creator, taxon, license, and observation date.

## After downloading

```bash
shasum -a 256 <file>
npm run audio-sources:import -- <metadata.json>
npm run sound-samples:validate
npm run audio-sources:evaluate
npm run sound-samples:calibration-report
npm run test-corpus:status
```

The checksum must be recorded before analysis. A changed file is a new source
record, never an in-place replacement.

## Acceptance requirements

- At least three independent recordings per taxon.
- At least two distinct recordists or source observations where practical.
- No single recording may supply both training and test partitions.
- Human or source-observation identification is recorded separately from model
  output.
- Quiet, clipped, speech-heavy, and ambiguous recordings remain in the corpus
  with quality flags; they are not silently discarded.
- User-supplied recordings remain evaluation-only until provenance and rights
  are documented.

## Current priorities

Complete elk, black bear, grizzly, and cougar first, then moose, wolf, coyote,
and the high-priority birds in the expanded Golden profile.
