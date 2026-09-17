# Local model candidate artifacts

This directory is for local evaluation only. Model weights are intentionally
ignored from Git and must never be published without an approved Traverse model
manifest, provenance, and licensing review.

Current local artifact:

- BirdNET v2.4 FP16 TFLite package
- Source: https://zenodo.org/records/15050749
- Official MD5: `4cd35da63e442d974faf2121700192b5`
- Local file: `birdnet-v2.4/BirdNET_v2.4_tflite_fp16.zip`
- Status: evaluation-only; not converted or pinned for production

Nocturne v1.2 Teacher is also staged locally:

- Source: https://huggingface.co/stratus-labs/nocturne-v1.2-teacher
- Revision: `4ad0db1214690ee8b21063fa8bf9022a2cbf0f67`
- Weights: `best.pt` (335 MB)
- SHA-256: `ac3649807a1d52c100bde38d523f257bc4197a4c9433a6d548c032512d5238a7`
- Declared weights license: CC-BY-4.0
- Status: evaluation-only; not converted or pinned for production
