# EarthChirp insect candidate

Status: rights verified and artifacts pinned; execution blocked by the Perch
WASM dependency.

## Exact artifacts

EarthChirp v1.0.0 is published at [Zenodo record 20696320](https://zenodo.org/records/20696320).
The derived artifacts are CC BY 4.0:

- classifier head: `global_clf_classifier_head.joblib`, SHA-256
  `7ae4ec909b044a0a04e474e6bfeee1cba6aa5852d5df24f72292eca4df9979b4`;
- reference prototypes: `global_reflib_protos.npy`, SHA-256
  `225db23a22ef491b87c5c2280385664e6b250793a2bcbd9b6c36e6ccc4422e96`;
- reference index: `global_reflib_index.parquet`, SHA-256
  `b8243cbf2011495e6dae8ab53464abfb5494d6f82cadb2f9b500a503c44fdfa1`;
- attribution manifest: `attributions.csv`, SHA-256
  `bf48cb8fe93ac18aefa8a6602991293ef64b5708f2d3da9ac51c05b9d1e11ac7`.

The deposit does not redistribute source recordings. Each recording remains
under its upstream GBIF, Xeno-canto, SINA, or InsectSingers license and is
credited by URL in the attribution manifest. EarthChirp code is separate and
MIT-licensed.

## Runtime boundary

EarthChirp is not a standalone audio model. It consumes 1,536-dimensional
Perch v2 embeddings and adds a classifier/reference layer for Orthoptera and
Cicadidae. Therefore it cannot be converted into a useful Traverse model until
the Perch embedding model runs under the governed WASM path.

The current Perch INT8 artifact fails Traverse ONNX packaging preflight during
`model_prepare` with `execution_failed`. We do not bypass this by running
Python, ONNX Runtime, or a host-side model in the application.

## Promotion decision

Keep EarthChirp as a rights-cleared, evaluation-only candidate. Revisit after
Perch has a passing Traverse package or after EarthChirp publishes a standalone
WASM-compatible artifact with equivalent rights and attribution evidence.
