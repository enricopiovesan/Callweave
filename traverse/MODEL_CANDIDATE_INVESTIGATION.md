# Model candidate investigation

## Decision status

The first real model is **not selected or downloaded**. The runtime integration
uses `fixture.echo` only. A broad audio model may be evaluated later as a
research-only benchmark after its exact artifact and license are approved.

## Evidence summary

| Candidate | Finding | Decision |
| --- | --- | --- |
| BirdNET | Strong bird classifier; released models are CC BY-NC-SA 4.0 while source is MIT. | Do not use as the default general/commercial model. |
| Perch | Bioacoustic project focused primarily on birds; model artifacts are distributed separately. | Consider only for a future bird-specialist package. |
| YAMNet | 521 AudioSet sound-event classes; broad event baseline, not species-grade wildlife identification. | Candidate for research-only benchmark after artifact/license verification. |
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
