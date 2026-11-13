# AnuraPAM amphibian candidate

Status: rights verified and TFLite artifact pinned; Traverse conversion and
geographic suitability remain unresolved.

## Exact artifact

AnuraPAM CompSeg v1 is published at [Zenodo record 20179472](https://zenodo.org/records/20179472)
under CC BY 4.0. The staged model is:

- `AnuraPAM_CompSeg.tflite`;
- size: 52,802,836 bytes;
- MD5: `63fbcf70d4be36efbf64f52efc563223`;
- SHA-256: `733792482746727b30987b59af11ac030b75dd134625898e2283a7bd98322085`.

The published package includes labels and model configuration. Attribution is
required under CC BY 4.0.

## Suitability and runtime boundary

The model covers 14 Central European anuran species. That is useful as a
research reference but is not a Golden/British Columbia species catalog.
Location configuration must not silently present these labels as local
species.

The artifact is TFLite. Traverse's verified model packaging path currently
accepts ONNX runner inputs, not TFLite archives. The model therefore remains
outside the executable WASM set; no host-side TFLite runtime is introduced as
a shortcut.

## Promotion decision

Keep AnuraPAM evaluation-only. Revisit if Traverse adds a governed TFLite
conversion path or the authors publish an equivalent ONNX/WASM artifact, and
only enable it for locations whose configured fauna includes its target taxa.
