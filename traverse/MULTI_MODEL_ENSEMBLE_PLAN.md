# Multi-model animal-sound ensemble

Callweave does not depend on one universal classifier. Each frozen model is an
independent evidence source selected by family, location configuration, input
profile, and rights policy. The ensemble remains generic; no capability embeds
a vendor or species list.

## Initial model roles

| Role | Model | Status | Output use |
|---|---|---|---|
| Broad event gate | YAMNet WASM | Runnable locally | Animal/non-animal context and unknown routing |
| Bird specialist | BirdNET v2.4 or v3 after exact rights review | Optional | Bird candidate evidence; non-commercial restrictions may apply |
| Broad multispecies baseline | Perch 2.0 | Evaluated, weak mammal result | Embeddings and broad candidate evidence; not sole mammal authority |
| Non-bird baseline | Nocturne v1.2 | Evaluation-only | Comparative evidence; no promotion yet |
| Bat specialist | BSG-BAT or equivalent | Separate future slice | Ultrasonic bat evidence only; requires a suitable microphone |
| Mammal reference matcher | Perch/YAMNet embeddings plus licensed references | Next implementation | Elk/bear/cougar/moose/deer similarity evidence without training |

## Reconciliation rules

1. Run only models whose exact package, digest, target, and rights are verified.
2. Preserve each model's raw scores, labels, version, and license separately.
3. Apply location configuration only to candidate filtering and priors; never
   rewrite a model's labels.
4. Agreement may raise evidence quality, but never converts raw scores into a
   verified observation without calibration.
5. Disagreement, unavailable specialists, weak similarity, or missing taxonomy
   coverage produce explicit `unknown` or `review_required` evidence.
6. No model is silently substituted because another family is unavailable.
7. The final outcome records which models ran and which were unavailable.

## Recommended execution order

1. YAMNet event gate.
2. Family routing from configuration and verified model availability.
3. BirdNET for bird candidates when explicitly enabled.
4. Perch/Nocturne evidence for broad non-bird comparison.
5. Reference matching for terrestrial mammals.
6. Deterministic score calibration and ensemble reconciliation.
7. Human review for any result that is not supported by independent evidence.

This keeps the project useful without claiming that any single model can
recognize every animal or every recording condition.
