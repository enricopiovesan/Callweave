import { createHash } from 'node:crypto';

const traceId = (requestId, reasonCode) =>
  `trace-${createHash('sha256').update(JSON.stringify({ requestId, reasonCode })).digest('hex').slice(0, 16)}`;

const resultRef = ({ workspaceId, locationId, preparedAudioId, modelSelectionId, idempotencyKey }) =>
  `acoustic-evidence-${createHash('sha256').update(JSON.stringify({
    workspaceId,
    locationId,
    preparedAudioId,
    modelSelectionId,
    idempotencyKey,
  })).digest('hex').slice(0, 16)}`;

function validateRequest(request) {
  if (!request || typeof request !== 'object') return 'invalid_input';
  if (!request.request_id || !request.workspace_id || !request.location_id || !request.idempotency_key) return 'invalid_input';
  if (!request.prepared_audio_ref?.id || !request.model_selection?.id) return 'invalid_input';
  const context = request.runtime_context;
  if (!context) return 'invalid_input';
  if (!['resolvable', 'unresolvable'].includes(context.input_reference_state)) return 'invalid_input';
  if (!['available', 'unavailable'].includes(context.dependency_state)) return 'invalid_input';
  if (!['allowed', 'denied'].includes(context.policy_state)) return 'invalid_input';
  return null;
}

/**
 * Thin host-owned compatible execution path for callweave.acoustics-classify.
 * It only enforces declared adapter activation/authorization and maps runtime
 * states to contract outputs. It does not implement inference logic itself.
 */
export function runAcousticsClassifyCompatible({ request, runtime }) {
  const invalid = validateRequest(request);
  if (invalid) {
    return {
      status: 'rejected',
      reason_code: 'invalid_input',
      acoustic_evidence_ref: null,
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
      acoustic_evidence_ref: null,
      trace_ref: traceId(requestId, 'invalid_input'),
      warnings: ['invalid_input'],
    };
  }

  if (context.dependency_state === 'unavailable') {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      acoustic_evidence_ref: null,
      trace_ref: traceId(requestId, 'dependency_unavailable'),
      warnings: ['dependency_unavailable'],
    };
  }

  if (context.policy_state === 'denied') {
    return {
      status: 'rejected',
      reason_code: 'policy_denied',
      acoustic_evidence_ref: null,
      trace_ref: traceId(requestId, 'policy_denied'),
      warnings: ['policy_denied'],
    };
  }

  const modelRuntimeActivation = runtime.activate({
    adapterId: 'local-model-runtime',
    target: 'local',
    configRef: { id: `${workspaceId}:${locationId}:model-runtime` },
  });
  if (!modelRuntimeActivation.activated) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      acoustic_evidence_ref: null,
      trace_ref: modelRuntimeActivation.trace.id,
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
      acoustic_evidence_ref: null,
      trace_ref: stateStoreActivation.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  const classifyAuth = runtime.authorize({
    adapterId: 'local-model-runtime',
    operation: 'classify-prepared-audio',
    payloadBytes: JSON.stringify({
      prepared_audio_ref: request.prepared_audio_ref,
      model_selection: request.model_selection,
      idempotency_key: idempotencyKey,
    }).length,
  });
  if (!classifyAuth.authorized) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      acoustic_evidence_ref: null,
      trace_ref: classifyAuth.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  const appendAuth = runtime.authorize({
    adapterId: 'local-state-store',
    operation: 'append',
    payloadBytes: JSON.stringify({
      workspace_id: workspaceId,
      location_id: locationId,
      prepared_audio_ref: request.prepared_audio_ref,
      model_selection: request.model_selection,
      idempotency_key: idempotencyKey,
    }).length,
  });
  if (!appendAuth.authorized) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      acoustic_evidence_ref: null,
      trace_ref: appendAuth.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  return {
    status: 'completed',
    reason_code: 'ok',
    acoustic_evidence_ref: resultRef({
      workspaceId,
      locationId,
      preparedAudioId: request.prepared_audio_ref.id,
      modelSelectionId: request.model_selection.id,
      idempotencyKey,
    }),
    trace_ref: traceId(requestId, 'ok'),
    warnings: [],
  };
}
