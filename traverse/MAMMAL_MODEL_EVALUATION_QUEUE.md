# Mammal model evaluation queue

Status: candidates only; no new model is approved or downloaded.

## Recommended first evaluation: Google Perch 2.0

Perch 2.0 is the leading candidate for the mammal slice. Google describes it
as a broad bioacoustic model covering mammals, amphibians, birds, and other
sound classes, and the official source repository is Apache-2.0. The exact
weights and label artifact still require independent provenance and rights
verification before Callweave distributes them.

Recommended implementation shape:

1. Evaluate the frozen Perch 2.0 encoder or a precisely identified CPU
   variant, not an unpinned download.
2. Use its embeddings with a compact mammal classification head configured by
   location, rather than shipping the full large taxonomy as the first WASM
   package.
3. Train/evaluate a small Golden-relevant head only from recordings whose
   redistribution rights are documented.
4. Compare against Nocturne and YAMNet on elk, black bear, cougar, moose,
   deer, livestock, human speech, water, wind, and silence controls.
5. Promote only a package that passes exact-license, digest, WASM-resource,
   calibration, and unknown-rejection gates.

The current Perch artifact is a strong general acoustic baseline, but the
Golden black-bear fixtures rank poorly. The next model must be evaluated as a
separate evidence source, not silently substituted for Perch.

| Candidate | Why evaluate | Required gate |
| --- | --- | --- |
| `onnx-community/10-animals-classification-ONNX` | Small animal-classification candidate visible on Hugging Face | Verify model-card license, labels, artifact revision, and WASM memory |
| `jafet21/yamnetonnx` | Environmental sound baseline for animal/non-animal rejection | Verify license and whether mammal labels are sufficiently specific |
| A purpose-trained mammal classifier | Potentially better bear/elk/cougar discrimination | Require explicit artifact license, reproducible checksum, and training-data terms |

## Required evaluation protocol

1. Pin an immutable repository revision and artifact checksum.
2. Record SPDX license, attribution, commercial-use terms, and model labels.
3. Run the 29-taxon Golden profile, four confirmed mammal fixtures, public-source
   fixtures, and nine negative controls.
4. Measure taxonomy coverage, top-5 recall, false-positive rate on controls,
   peak RAM, inference latency, and deterministic repeatability.
5. Keep the model optional until it beats the current baseline without
   unacceptable privacy, memory, or licensing trade-offs.

No download or model selection should occur until these gates are explicitly
approved.
