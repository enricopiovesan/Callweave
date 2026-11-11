# Corpus evidence report

Callweave keeps corpus provenance separate from model inference. This is a
business-logic requirement, not a UI convention.

Run:

```bash
npm run sound-samples:validate
npm run sound-samples:evaluate
npm run corpus:evidence-report -- output/corpus-evidence-report.json
```

The report has four distinct inventories:

1. **Staged public-source records** — source URL, media URL, attribution,
   license, checksum, and taxon are retained. These are candidates for
   redistribution only after final import review.
2. **User-supplied evaluation records** — checksum-verified local fixtures with
   no assumed redistribution rights. They may support regression analysis but
   must not be copied into a release package without a verified source license.
3. **Long-form fixtures** — realistic environmental recordings whose expected
   result is normally `unknown`; they exercise segmentation, background noise,
   interruption, and resource bounds rather than species accuracy.
4. **Model candidates** — exact artifact/version and rights status. A declared
   license is not treated as proof that the exact artifact is safe to activate.

The report must not be used to claim species accuracy. Current model outputs
are uncalibrated ranking evidence. Promotion requires an exact signed model
package, rights verification, held-out positive and negative controls, and a
versioned calibration policy. Until then, unknown/abstain is the valid result.

This boundary lets the Traverse runtime consume portable evidence without
embedding Golden-specific assumptions or silently turning sample provenance
into a licensing grant.
