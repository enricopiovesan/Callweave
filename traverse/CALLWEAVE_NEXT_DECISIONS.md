# Callweave next decisions and executable roadmap

## What is already complete

- Generic audio, evidence, policy, retention, review, and model-management
  capabilities are checked in as portable WASM contracts and fixtures.
- Traverse web model execution is exercised with a signed YAMNet-derived WASM
  package. The package binding verifies exact manifest and WASM digests.
- The model binding fails closed until a trusted production public key exists.
- The PWA records locally and exposes honest `model_unavailable` behavior.

## Work that can proceed now

1. Keep the generic PCM pipeline under regression: bounded WAV decode, channel
   conversion, downsampling, window seams, Nyquist negative controls, and real
   recording corpus checks.
2. Run the YAMNet event gate over the corpus and preserve raw scores as model
   evidence; never turn its broad labels into species observations.
3. Add the same model-rights disclosure to native settings surfaces.
4. Prepare the Registry model-package submission packet and benchmark report.
5. Implement multi-model evidence reconciliation using opaque model references,
   explicit missing-model records, and an `unknown` outcome when evidence is
   insufficient.
6. After a specialist model is approved, add its exact pin and run offline
   warm-cache/missing-cache tests on every target.

## Questions requiring a project decision

| Question | Recommendation | Why |
|---|---|---|
| What is the first specialist model? | Start with one permissively redistributable specialist, preferably a compact bird model if its exact artifact terms pass review. | Minimizes legal and packaging risk while producing a useful first end-to-end result. |
| Are non-commercial models allowed? | Yes, but optional and visibly restricted; never enabled by default. | Preserves research options without implying commercial rights. |
| Who owns the production signing root? | Callweave, separate from Registry capability signing. | Traverse verifies it; Callweave controls model release authorization. |
| Where is the private key kept? | A protected maintainer-reviewed CI environment or offline release machine; never in Git or ordinary PR CI. | Limits accidental disclosure and supports rotation/revocation. |
| Should YAMNet ship as the recognizer? | No. Use it only as a broad event gate until a specialist is available. | Its output is AudioSet event evidence, not species identification. |
| Should the first release support multiple models? | Build the generic ensemble path now, ship one specialist first, and add others independently. | Avoids coupling the first release to a large model set while preserving extensibility. |
| What is the first target? | Browser/PWA. | It has the working signed model host and fastest feedback loop. |

## External dependencies

- Traverse #1567: production model-signing key lifecycle. Maintainer action is
  required; this repository cannot safely invent or commit the key.
- Traverse #1582: web/native host ceilings and mid-run interruption. Important
  for long-running production inference, but not required for the current
  bounded YAMNet smoke path.
- A specialist model artifact with immutable provenance, legal rights, a
  versioned label schema, and a successful WASM resource/conformance report.
