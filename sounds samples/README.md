# Sound samples

These user-supplied recordings are evaluation fixtures for the local acoustic
pipeline. They are labelled by the filename only; the labels are not model
ground truth and must not be used as automatic training labels.

## Provenance and licensing

The source URL, creator, recording date, and redistribution licence are not yet
known for these files. Keep them local and do not publish or redistribute them
until that provenance is documented. The manifest records SHA-256 hashes so a
future provenance update cannot silently replace an evaluation sample.

## Intended use

- regression tests for elk, black bear, grizzly bear, and cougar/mountain lion;
- candidate-aware scoring and location filtering;
- calibration and false-negative evaluation;
- no automatic promotion to verified wildlife observations.

Run the current analyzer over one sample with:

```bash
npm run analyze:audio -- "sounds samples/elk.mp3" output/samples/elk
```

All generated evidence remains model evidence. Human confirmation is required
before a sample becomes a labelled calibration record.
