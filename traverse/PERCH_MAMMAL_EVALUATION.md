# Perch 2.0 frozen mammal evaluation

Date: 2026-11-10

## Finding

Perch 2.0 is the strongest frozen pretrained candidate found so far, but it is
not yet a ready Callweave browser package.

- The official Google source is Apache-2.0.
- The published classifier has roughly 14,795 labels and includes relevant
  taxa such as `Cervus canadensis`, `Cervus elaphus`, `Puma concolor`,
  `Ursus americanus`, `Ursus arctos`, and several `Vulpes` species.
- The official model artifact is approximately 409 MB FP32. Public converted
  variants report approximately 205 MB FP16 and 105 MB dynamic-INT8.
- The official release instructions currently target TensorFlow/GPU workflows;
  the smaller converted variants are third-party artifacts and require their
  own provenance, digest, and license review.
- The classifier is broad and bird-heavy. Label presence is not evidence that
  a Golden mammal is detected reliably in field recordings.

## Decision

Do not publish or activate a Perch package yet. Do not train a new head.

The next valid evaluation is a frozen-artifact benchmark using an exact,
publicly identified Perch variant:

1. verify the artifact source, license, conversion revision, and digest;
2. run CPU inference on the supplied elk, bear, and forest recordings;
3. measure memory, latency, and output stability;
4. retain raw logits and mark species results as uncalibrated evidence;
5. reject the package if the target runtime cannot enforce its resource limits.

## Current recommendation

Use Perch as the first frozen mammal-capable evaluation candidate, with a
native/desktop proof before attempting browser/WASM packaging. Keep YAMNet as
the small broad-event gate. If Perch cannot meet the WASM budget, the honest
fallback is broad event detection plus `unknown`, not a fabricated mammal
classifier.
