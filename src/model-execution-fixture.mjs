import { normalizeInferenceResponse, validateInferenceRequest } from './model-execution.mjs';

/**
 * Deterministic conformance fixture, not a production model. It computes a
 * bounded checksum over supplied bytes so the runtime envelope can be tested
 * before Traverse model invocation exists.
 */
export function executeSyntheticModel({ request, manifest, target = 'wasm32-wasi', cancelled = false }) {
  const validated = validateInferenceRequest({ request, manifest, target });
  if (cancelled) return normalizeInferenceResponse({ request, response: { status: 'cancelled', model_ref: request.model_ref, trace_id: `trace:${validated.request_id}` } });
  if (request.payload_bytes.length > (request.limits.max_output_bytes ?? manifest.limits.max_output_bytes)) return normalizeInferenceResponse({ request, response: { status: 'resource_exhausted', model_ref: request.model_ref } });
  const checksum = request.payload_bytes.reduce((sum, value) => (sum + value) % 65536, 0);
  return normalizeInferenceResponse({ request, response: { status: 'ok', output_schema_ref: manifest.output_schema_ref, output_bytes: [checksum & 255, checksum >> 8], model_ref: request.model_ref, placement: 'wasm-cpu', trace_id: `trace:${validated.request_id}` } });
}
