import { createHash } from 'node:crypto';

const traceId = (requestId, reasonCode) =>
  `trace-${createHash('sha256').update(JSON.stringify({ requestId, reasonCode })).digest('hex').slice(0, 16)}`;

const resultRef = ({ workspaceId, locationId, audioSourceRefId, captureWindowId, idempotencyKey }) =>
  `recording-${createHash('sha256').update(JSON.stringify({
    workspaceId,
    locationId,
    audioSourceRefId,
    captureWindowId,
    idempotencyKey,
  })).digest('hex').slice(0, 16)}`;

function validateRequest(request) {
  if (!request || typeof request !== 'object') return 'invalid_input';
  if (!request.request_id || !request.workspace_id || !request.location_id || !request.idempotency_key) return 'invalid_input';
  if (!request.audio_source_ref?.id || !request.capture_window?.id) return 'invalid_input';
  const context = request.runtime_context;
  if (!context) return 'invalid_input';
  if (!['resolvable', 'unresolvable'].includes(context.input_reference_state)) return 'invalid_input';
  if (!['available', 'unavailable'].includes(context.dependency_state)) return 'invalid_input';
  if (!['allowed', 'denied'].includes(context.policy_state)) return 'invalid_input';
  return null;
}

/**
 * Thin host-owned compatible execution path for callweave.audio-capture.
 * It enforces declared adapter activation/authorization only; it does not
 * implement actual capture logic inside the wrapper.
 */
export function runAudioCaptureCompatible({ request, runtime }) {
  const invalid = validateRequest(request);
  if (invalid) {
    return {
      status: 'rejected',
      reason_code: 'invalid_input',
      recording_ref: null,
      trace_ref: traceId(request?.request_id ?? 'missing', 'invalid_input'),
      warnings: ['invalid_input'],
    };
  }

  const {
    request_id: requestId,
    workspace_id: workspaceId,
    location_id: locationId,
    idempotency_key: idempotencyKey,
  } = request;
  const context = request.runtime_context;

  if (context.input_reference_state === 'unresolvable') {
    return {
      status: 'rejected',
      reason_code: 'invalid_input',
      recording_ref: null,
      trace_ref: traceId(requestId, 'invalid_input'),
      warnings: ['invalid_input'],
    };
  }

  if (context.dependency_state === 'unavailable') {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      recording_ref: null,
      trace_ref: traceId(requestId, 'dependency_unavailable'),
      warnings: ['dependency_unavailable'],
    };
  }

  if (context.policy_state === 'denied') {
    return {
      status: 'rejected',
      reason_code: 'policy_denied',
      recording_ref: null,
      trace_ref: traceId(requestId, 'policy_denied'),
      warnings: ['policy_denied'],
    };
  }

  const audioDeviceActivation = runtime.activate({
    adapterId: 'audio-device',
    target: 'local',
    configRef: { id: `${workspaceId}:${locationId}:audio-device` },
  });
  if (!audioDeviceActivation.activated) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      recording_ref: null,
      trace_ref: audioDeviceActivation.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  const objectStoreActivation = runtime.activate({
    adapterId: 'local-object-store',
    target: 'local',
    configRef: { id: `${workspaceId}:${locationId}:object-store` },
  });
  if (!objectStoreActivation.activated) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      recording_ref: null,
      trace_ref: objectStoreActivation.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  const stateStoreActivation = runtime.activate({
    adapterId: 'local-state-store',
    target: 'local',
    configRef: { id: `${workspaceId}:${locationId}:state-store` },
  });
  if (!stateStoreActivation.activated) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      recording_ref: null,
      trace_ref: stateStoreActivation.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  const captureAuth = runtime.authorize({
    adapterId: 'audio-device',
    operation: 'capture-window',
    payloadBytes: JSON.stringify({
      audio_source_ref: request.audio_source_ref,
      capture_window: request.capture_window,
      idempotency_key: idempotencyKey,
    }).length,
  });
  if (!captureAuth.authorized) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      recording_ref: null,
      trace_ref: captureAuth.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  const storeAuth = runtime.authorize({
    adapterId: 'local-object-store',
    operation: 'store-recording',
    payloadBytes: JSON.stringify({
      audio_source_ref: request.audio_source_ref,
      capture_window: request.capture_window,
      idempotency_key: idempotencyKey,
    }).length,
  });
  if (!storeAuth.authorized) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      recording_ref: null,
      trace_ref: storeAuth.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  const appendAuth = runtime.authorize({
    adapterId: 'local-state-store',
    operation: 'append',
    payloadBytes: JSON.stringify({
      workspace_id: workspaceId,
      location_id: locationId,
      audio_source_ref: request.audio_source_ref,
      capture_window: request.capture_window,
      idempotency_key: idempotencyKey,
    }).length,
  });
  if (!appendAuth.authorized) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      recording_ref: null,
      trace_ref: appendAuth.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  return {
    status: 'completed',
    reason_code: 'ok',
    recording_ref: resultRef({
      workspaceId,
      locationId,
      audioSourceRefId: request.audio_source_ref.id,
      captureWindowId: request.capture_window.id,
      idempotencyKey,
    }),
    trace_ref: traceId(requestId, 'ok'),
    warnings: [],
  };
}
