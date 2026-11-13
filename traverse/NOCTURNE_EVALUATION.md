# Nocturne v1.2 teacher candidate

Status: exact PyTorch artifact and CC BY 4.0 rights identified; no portable
Traverse artifact exists yet.

## Exact release

The model is published at
[`stratus-labs/nocturne-v1.2-teacher`](https://huggingface.co/stratus-labs/nocturne-v1.2-teacher)
at revision `8e31cde23c4531fa1fc169f725272dc9a6815e89`.

- model card license: CC BY 4.0;
- executable file: `best.pt`;
- supporting files: `model.py`, `config.yaml`, `vocab.json`, `thresholds.json`,
  and evaluation reports;
- input: 10-second mono waveform at 16 kHz;
- scope: non-bird species, including insects, amphibians, mammals, and
  reptiles, with the model card's stated generalization limitations.

## Runtime boundary

The release does not include ONNX or WASM. Traverse's governed packaging path
does not execute PyTorch `.pt` files directly. A future conversion would need
an auditable export toolchain, exact numerical parity against the PyTorch
reference, resource measurements, and a signed `traverse-model-wasm` package.

No Python/PyTorch host execution is added to Callweave as a shortcut.

## Promotion decision

Keep Nocturne evaluation-only. It becomes a valid next conversion target only
after an ONNX/WASM export is publicly pinned and the export passes Traverse
conformance and field/negative-control evaluation.
