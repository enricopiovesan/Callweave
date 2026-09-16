# Model evaluation record template

Complete one record per candidate before creating a Traverse model package or
Registry publication request.

## Identity and provenance

```yaml
candidate_id: <stable inventory id>
upstream_url: <canonical source>
upstream_revision: <tag or commit>
artifact_filename: <exact file>
artifact_sha256: <64 hex characters>
package_sha256: <64 hex characters>
```

## Licensing and rights

```yaml
code_spdx_expression: <SPDX expression>
weights_spdx_expression: <SPDX expression or LicenseRef>
data_license_summary: <source-by-source summary>
commercial_use: allowed | forbidden | conditional | unknown
redistribution: allowed | forbidden | conditional | unknown
attribution_required: true | false
license_evidence_urls: []
review_status: pending | approved | rejected
reviewer: <human reviewer>
```

Code, weights, labels, and training data MUST be reviewed separately. A
permissive source-code license does not grant rights to model weights or data.

## Model contract conversion

```yaml
source_format: <PyTorch | TensorFlow | TFLite | ONNX | other>
traverse_format: traverse-model-wasm
abi_version: 1
input_schema_ref: <schema id>
output_schema_ref: <schema id>
supported_profiles: [wasm-cpu]
conversion_revision: <public build commit>
numerical_parity: pending | passed | failed
```

## Resource evidence

```yaml
max_memory_bytes: <measured ceiling>
max_fuel: <measured ceiling>
max_input_bytes: <ceiling>
max_output_bytes: <ceiling>
max_execution_ms: <ceiling>
target_hardware: <CPU and memory used for measurement>
```

## Ecological evaluation

```yaml
taxonomy_scope: <families/species represented>
location_profile: <location configuration id>
evaluation_dataset_revision: <immutable dataset revision>
negative_controls: <dataset revision>
metrics:
  precision: <value>
  recall: <value>
  macro_f1: <value>
  unknown_rate: <value>
calibration_method: <description>
known_failure_modes: []
field_validation_status: not_started | research_only | reviewed | approved
```

Results must distinguish research benchmarks from field reliability. Broad
event labels must not be presented as confirmed species.

## Publication decision

An artifact may be published only when identity, rights, ABI conversion,
resource evidence, ecological evaluation, and human review are all complete.
Until then, its inventory status remains `evaluation_only` or `review_only`.
