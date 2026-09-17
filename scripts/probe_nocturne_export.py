#!/usr/bin/env python3
"""Safely probe Nocturne's AST checkpoint and export its model stage to ONNX.

This developer tool intentionally uses weights_only=True and exports normalized
log-mel input ([batch, 1024, 128]); audio DSP is a separate capability.
Dependencies are isolated from the application (torch, transformers, onnx).
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

import torch
from transformers import ASTConfig, ASTModel
from torch import nn


def remap(state: dict[str, torch.Tensor]) -> dict[str, torch.Tensor]:
    rules = [
        (r"^backbone\.layers\.(\d+)\.attention\.q_proj\.", r"backbone.encoder.layer.\1.attention.attention.query."),
        (r"^backbone\.layers\.(\d+)\.attention\.k_proj\.", r"backbone.encoder.layer.\1.attention.attention.key."),
        (r"^backbone\.layers\.(\d+)\.attention\.v_proj\.", r"backbone.encoder.layer.\1.attention.attention.value."),
        (r"^backbone\.layers\.(\d+)\.attention\.o_proj\.", r"backbone.encoder.layer.\1.attention.output.dense."),
        (r"^backbone\.layers\.(\d+)\.mlp\.fc1\.", r"backbone.encoder.layer.\1.intermediate.dense."),
        (r"^backbone\.layers\.(\d+)\.mlp\.fc2\.", r"backbone.encoder.layer.\1.output.dense."),
        (r"^backbone\.layers\.(\d+)\.layernorm_(before|after)\.", r"backbone.encoder.layer.\1.layernorm_\2."),
    ]
    out = {}
    for key, value in state.items():
        new_key = key
        for pattern, replacement in rules:
            new_key = re.sub(pattern, replacement, new_key)
        out[new_key] = value
    return out


class ModelStage(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        config = ASTConfig(
            hidden_size=768,
            num_hidden_layers=12,
            num_attention_heads=12,
            intermediate_size=3072,
            patch_size=16,
            num_mel_bins=128,
            max_length=1024,
            hidden_dropout_prob=0.0,
            attention_probs_dropout_prob=0.0,
        )
        self.backbone = ASTModel(config)
        self.head = nn.Sequential(nn.LayerNorm(768), nn.Dropout(0.2), nn.Linear(768, 2196))

    def forward(self, logmel: torch.Tensor) -> torch.Tensor:
        output = self.backbone(input_values=logmel)
        return self.head(output.last_hidden_state[:, :2, :].mean(dim=1))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    state = torch.load(args.checkpoint, map_location="cpu", weights_only=True)
    if not isinstance(state, dict):
        raise TypeError("checkpoint must contain a state dictionary")
    state = {key: value for key, value in state.items() if not key.startswith("logmel.")}
    model = ModelStage().eval()
    model.load_state_dict(remap(state), strict=True)
    sample = torch.zeros(1, 1024, 128)
    with torch.no_grad():
        logits = model(sample)
    if logits.shape != (1, 2196) or not torch.isfinite(logits).all():
        raise RuntimeError(f"unexpected probe output: {tuple(logits.shape)}")
    torch.onnx.export(
        model,
        sample,
        args.output,
        input_names=["logmel"],
        output_names=["logits"],
        opset_version=17,
        dynamic_axes={"logmel": {0: "batch"}, "logits": {0: "batch"}},
    )
    print(f"nocturne_export=passed output={args.output} logits=1x2196")


if __name__ == "__main__":
    main()
