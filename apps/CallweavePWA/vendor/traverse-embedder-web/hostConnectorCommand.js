/**
 * Shared Spec 137 host-connector command/event contract for browser and macOS.
 * Host adapters stay out of this module; they remain platform implementations.
 */
export const HOST_CONNECTOR_COMMAND_SCHEMA_VERSION = "1.0.0";
export const HOST_CONNECTOR_COMMAND_KIND = "host_connector_command";
export const HOST_CONNECTOR_RESULT_KIND = "host_connector_result";
export const HOST_CONNECTOR_EVENT_KIND = "host_connector_event";
export const HOST_CONNECTOR_GOVERNING_SPEC = "137-host-connector-command-dispatch";
export const AUDIO_INPUT_CONNECTOR = "traverse.audio-input";
export const AUDIO_CAPTURE_OPERATION = "audio.capture";
export const AUDIO_PERMISSION_REQUEST_OPERATION = "audio.permission.request";
export const MODEL_RUNTIME_CONNECTOR = "traverse.model-runtime";
export const MODEL_EXECUTE_OPERATION = "model.execute";
export const MODEL_RUNTIME_GOVERNING_SPEC = "138-governed-exact-model-execution";
export const PLACEMENT_WASM_CPU = "wasm-cpu";
/**
 * Normalize a Spec 138 model.execute success/failure for cross-target compare.
 * Strips host-private fields; keeps status-bearing public codes and identity.
 */
export function normalizeModelExecuteEvidence(input) {
    return {
        governing_spec: MODEL_RUNTIME_GOVERNING_SPEC,
        status: input.status ?? (input.error_code ? "failed" : "ok"),
        error_code: input.error_code ?? null,
        model_ref: input.model_ref ?? null,
        placement: input.placement ?? PLACEMENT_WASM_CPU,
        has_output_ref: Boolean(input.output_ref ?? input.artifact_ref),
    };
}
export function modelExecuteCommand(commandId, correlationId, idempotencyKey, targetFamily, payload) {
    return {
        kind: HOST_CONNECTOR_COMMAND_KIND,
        schema_version: HOST_CONNECTOR_COMMAND_SCHEMA_VERSION,
        command: "run_local_model",
        command_id: commandId,
        correlation_id: correlationId,
        idempotency_key: idempotencyKey,
        target_family: targetFamily,
        cancel_requested: false,
        payload: { ...payload },
    };
}
export function audioCaptureCommand(commandId, correlationId, idempotencyKey, targetFamily, payload) {
    return {
        kind: HOST_CONNECTOR_COMMAND_KIND,
        schema_version: HOST_CONNECTOR_COMMAND_SCHEMA_VERSION,
        command: "capture_audio",
        command_id: commandId,
        correlation_id: correlationId,
        idempotency_key: idempotencyKey,
        target_family: targetFamily,
        cancel_requested: false,
        payload: { ...payload },
    };
}
export function audioPermissionCommand(commandId, correlationId, idempotencyKey, targetFamily) {
    return {
        kind: HOST_CONNECTOR_COMMAND_KIND,
        schema_version: HOST_CONNECTOR_COMMAND_SCHEMA_VERSION,
        command: "request_permission",
        command_id: commandId,
        correlation_id: correlationId,
        idempotency_key: idempotencyKey,
        target_family: targetFamily,
        cancel_requested: false,
        payload: {},
    };
}
