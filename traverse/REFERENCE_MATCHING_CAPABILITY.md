# Embedding reference matching

Reference matching is the no-training mammal path. A frozen model produces an
embedding; the capability compares it with a location-configured catalog of
rights-cleared reference recordings. It returns a candidate only when the
nearest similarity and the margin over the next taxon pass policy thresholds.
Otherwise it returns `unknown`.

The capability never trains a model, changes model labels, or treats similarity
as a verified observation. Every match preserves the reference ID, source, and
license so evidence remains auditable. The current deterministic kernel is
`src/embedding-reference-match.mjs`; the runtime-facing WASM contract should
follow the same input/output behavior before Registry publication.
