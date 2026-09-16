import { stableId } from './stable-id.mjs';

const required = (value, name) => {
  if (value === undefined || value === null || value === '') throw new Error(`${name} is required`);
  return value;
};

export function validateModelManifest({ manifest }) {
  required(manifest, 'manifest');
  required(manifest.model_id, 'manifest.model_id');
  required(manifest.version, 'manifest.version');
  required(manifest.digest, 'manifest.digest');
  required(manifest.license?.spdx_id, 'manifest.license.spdx_id');
  required(manifest.abi_version, 'manifest.abi_version');
  if (!/^sha256:[0-9a-f]{64}$/.test(manifest.digest)) throw new Error('manifest.digest must be sha256');
  if (!Array.isArray(manifest.targets) || manifest.targets.length === 0) throw new Error('manifest.targets are required');
  for (const field of ['max_memory_bytes', 'max_input_bytes', 'max_output_bytes', 'max_execution_ms']) {
    if (!Number.isInteger(manifest.limits?.[field]) || manifest.limits[field] <= 0) throw new Error(`manifest.limits.${field} must be positive`);
  }
  if (!manifest.input_schema_ref || !manifest.output_schema_ref) throw new Error('manifest schemas are required');
  return { valid: true, model_id: manifest.model_id, version: manifest.version, digest: manifest.digest, targets: [...manifest.targets].sort(), limits: manifest.limits, license: manifest.license.spdx_id };
}

export function validateInferenceRequest({ request, manifest, target = 'wasm32-wasi' }) {
  required(request, 'request'); required(manifest?.model_id, 'manifest.model_id');
  if (request.model_ref?.model_id !== manifest.model_id || request.model_ref?.version !== manifest.version || request.model_ref?.digest !== manifest.digest) throw new Error('model_ref does not match manifest');
  if (!manifest.targets.includes(target)) throw new Error('target is not supported by model');
  if (request.input_schema_ref !== manifest.input_schema_ref) throw new Error('input schema is incompatible');
  if (!Array.isArray(request.payload_bytes) || request.payload_bytes.some(value => !Number.isInteger(value) || value < 0 || value > 255)) throw new Error('payload_bytes must be byte values');
  if (request.payload_bytes.length > manifest.limits.max_input_bytes) throw new Error('input exceeds model limit');
  if (!Number.isInteger(request.limits?.timeout_ms) || request.limits.timeout_ms <= 0 || request.limits.timeout_ms > manifest.limits.max_execution_ms) throw new Error('timeout exceeds model limit');
  return { valid: true, request_id: request.request_id ?? stableId('inference-request', request.model_ref), model_ref: request.model_ref, input_schema_ref: request.input_schema_ref, byte_length: request.payload_bytes.length, target };
}

export function normalizeInferenceResponse({ response, request }) {
  required(response?.status, 'response.status');
  const allowed = ['ok', 'invalid_input', 'model_unavailable', 'model_incompatible', 'resource_exhausted', 'cancelled', 'timeout', 'execution_failed'];
  if (!allowed.includes(response.status)) throw new Error('unsupported response.status');
  if (response.status === 'ok') {
    if (!Array.isArray(response.output_bytes) || response.output_bytes.some(value => !Number.isInteger(value) || value < 0 || value > 255)) throw new Error('successful response requires output_bytes');
    required(response.output_schema_ref, 'response.output_schema_ref');
  }
  const retryable = ['model_unavailable', 'timeout', 'execution_failed'].includes(response.status);
  return { request_id: request?.request_id ?? null, status: response.status, output_schema_ref: response.output_schema_ref ?? null, output_bytes: response.output_bytes ?? [], model_ref: response.model_ref ?? request?.model_ref ?? null, placement: response.placement ?? 'wasm-cpu', trace_id: response.trace_id ?? null, retryable, reason_code: response.reason_code ?? response.status };
}

export function evaluateModelCompatibility({ manifest, target, input_schema_ref, available_memory_bytes }) {
  required(manifest?.model_id, 'manifest.model_id'); required(target, 'target'); required(input_schema_ref, 'input_schema_ref');
  const reasons = [];
  if (!manifest.targets?.includes(target)) reasons.push('target_unsupported');
  if (manifest.input_schema_ref !== input_schema_ref) reasons.push('input_schema_incompatible');
  if (available_memory_bytes !== undefined && available_memory_bytes < manifest.limits.max_memory_bytes) reasons.push('memory_insufficient');
  return { compatible: reasons.length === 0, model_id: manifest.model_id, target, reasons, policy_version: 'compatibility-1' };
}

export function evaluateModelArtifactPolicy({ manifest, policy }) {
  required(manifest?.model_id, 'manifest.model_id'); required(policy?.version, 'policy.version');
  const reasons = [];
  if (!manifest.signature_verified) reasons.push('signature_unverified');
  if (!manifest.license?.redistributable) reasons.push('redistribution_not_allowed');
  if (policy.allowed_licenses && !policy.allowed_licenses.includes(manifest.license.spdx_id)) reasons.push('license_not_allowed');
  if (policy.max_memory_bytes && manifest.limits.max_memory_bytes > policy.max_memory_bytes) reasons.push('memory_policy_exceeded');
  return { decision: reasons.length ? 'reject' : 'allow', model_id: manifest.model_id, digest: manifest.digest, reasons, policy_version: policy.version };
}
