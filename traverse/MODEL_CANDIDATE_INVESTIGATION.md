# Model candidate investigation

## Decision status

The first real model is **not selected or downloaded**. The runtime integration
uses `fixture.echo` only. A broad audio model may be evaluated later as a
research-only benchmark after its exact artifact and license are approved.

## Evidence summary

| Candidate | Finding | Decision |
| --- | --- | --- |
| BirdNET | Strong bird classifier; released models are CC BY-NC-SA 4.0 while source is MIT. | First specialist target; non-commercial/share-alike only. |
| Perch | Apache-licensed project and useful embedding/reference model, but official documentation presents it primarily as a bird classifier and our mammal tests were weak. | Keep as broad/reference evidence, not the mammal solution. |
| YAMNet | 521 AudioSet sound-event classes; broad event baseline, not species-grade wildlife identification. | Candidate for research-only benchmark after artifact/license verification. |
| EarthChirp | CC-BY-4.0 preprint; ~29 MB Perch-based insect reference/classifier head for Orthoptera and Cicadidae. | Strong insect candidate; exact artifact and source-record rights still need pinning. |
| AnuraPAM | Ready-to-use TFLite/Raven classifiers for 14 Central European anurans; exact Zenodo rights not yet verified. | Amphibian research candidate, but geography is not Golden. |
| MegaDetector-Acoustic | MIT open framework with bird/beluga demos and training tooling; no ready general mammal package. | Framework/reference only; do not treat as a mammal model. |
| AST AudioSet | Broad classifier; the referenced model card reports 86.6M F32 parameters and BSD-3-Clause. | Technically possible but likely too large for the first offline target. |
| Custom compact model | Can target Golden-relevant taxa and use a controlled license/data pipeline. | Preferred long-term production direction. |

## Artifact admission checklist

Before any candidate is packaged as a Traverse model:

1. Pin an immutable upstream revision and exact model-file digest.
2. Verify the model artifact license independently from source-code license.
3. Record attribution, redistribution terms, and commercial-use status.
4. Export or convert to the Traverse guest ABI and verify numerical parity.
5. Measure wasm-cpu memory, fuel, input/output, and execution-time ceilings.
6. Evaluate against licensed Golden-relevant recordings and negative controls.
7. Record false-positive/false-negative results and confidence calibration.
8. Publish only a signed, exact-reference model package after explicit approval.

## Guardrails

- No model URL is an identity; only a signed digest-pinned package is valid.
- Broad sound-event labels must not be presented as confirmed animal species.
- The generic `model.execute` capability remains unchanged by model choice.
- Until admission is complete, Callweave may use the synthetic fixture only.

## Primary references

- [BirdNET Analyzer](https://github.com/birdnet-team/BirdNET-Analyzer)
- [Google Perch](https://github.com/google-research/perch)
- [TensorFlow YAMNet](https://www.tensorflow.org/hub/tutorials/yamnet)
- [MIT AST AudioSet model](https://huggingface.co/MIT/ast-finetuned-audioset-10-10-0.4593)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)
