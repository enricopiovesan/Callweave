# InsectNet research candidate

Status: exact research artifact pinned; not executable as a standalone Traverse
model.

## Artifact and rights

The public artifact is
[`TheVortexProject/insectnet-research-0.2.0-perch2`](https://huggingface.co/TheVortexProject/insectnet-research-0.2.0-perch2)
at revision `dbfc1bdb5b3f4c20f3c6fcee833a7f6c676ccf77`:

- file: `insectnet-research-0.2.0-perch2.joblib`;
- SHA-256: `27bf603a6dec2df2789b3bf9241f5e035ccdea5909c4ecf252623ff9304afe32`;
- license: CC BY-NC-SA 4.0;
- outputs: insect presence, cicada, and Orthoptera review heads.

The model card requires attribution, excludes source audio redistribution, and
explicitly prohibits treating the research artifact as an unattended ecological
counter or alert source.

## Runtime boundary

InsectNet consumes a 1,536-dimensional embedding produced by Perch v2. It is a
scikit-learn Joblib head, not an audio-to-WASM model. The Perch weights are not
included and their exact model-weight rights remain separate. Converting or
serializing the Joblib head alone would not produce a functioning Traverse
capability.

The dependency is currently blocked because the pinned Perch INT8 artifact
fails Traverse `model_prepare` preflight. No Python, Joblib, or host-side model
execution is introduced as a workaround.

## Promotion decision

Keep InsectNet evaluation-only. Revisit only after a governed Perch embedding
package passes conformance, and then package the head as a separate bounded
capability with explicit CC BY-NC-SA rights and review-only semantics.
