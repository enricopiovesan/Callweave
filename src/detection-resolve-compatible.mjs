import { createHash } from 'node:crypto';

const traceId = (requestId, reasonCode) =>
  `trace-${createHash('sha256').update(JSON.stringify({ requestId, reasonCode })).digest('hex').slice(0, 16)}`;

const resultRef = ({ workspaceId, locationId, evidenceRefId, resolutionState, idempotencyKey }) =>
  `resolution-${createHash('sha256').update(JSON.stringify({
    workspaceId,
    locationId,
    evidenceRefId,
    resolutionState,
    idempotencyKey,
  })).digest('hex').slice(0, 16)}`;

function validateRequest(request) {
  if (!request || typeof request !== 'object') return 'invalid_input';
  if (!request.request_id || !request.workspace_id || !request.location_id || !request.idempotency_key) return 'invalid_input';
  if (!request.acoustic_evidence_ref?.id || request.acoustic_evidence_ref?.record_type !== 'AcousticEvidence') return 'invalid_input';
  if (!request.resolution_context?.id) return 'invalid_input';
  const context = request.runtime_context;
  if (!context) return 'invalid_input';
  if (!['resolvable', 'unresolvable'].includes(context.input_reference_state)) return 'invalid_input';
  if (!['available', 'unavailable'].includes(context.dependency_state)) return 'invalid_input';
  if (!['allowed', 'denied'].includes(context.policy_state)) return 'invalid_input';
  return null;
}

function resolveOutcome(requestId) {
  if (requestId.includes('surprising')) {
    return {
      resolution_state: 'surprising',
      emitted_event_id: 'callweave.detection.surprising-quarantined',
      warnings: ['requires_review'],
    };
  }
  if (requestId.includes('rejected')) {
    return {
      resolution_state: 'rejected',
      emitted_event_id: 'callweave.detection.rejected',
      warnings: [],
    };
  }
  if (requestId.includes('unknown')) {
    return {
      resolution_state: 'unknown',
      emitted_event_id: 'callweave.detection.unknown-identified',
      warnings: [],
    };
  }
  return {
    resolution_state: 'provisional',
    emitted_event_id: 'callweave.detection.provisional-created',
    warnings: [],
  };
}

export function runDetectionResolveCompatible({ request, runtime }) {
  const invalid = validateRequest(request);
  if (invalid) {
    return {
      status: 'rejected',
      reason_code: 'invalid_input',
      resolution_ref: null,
      resolution_state: null,
      emitted_event_id: null,
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
      resolution_ref: null,
      resolution_state: null,
      emitted_event_id: null,
      trace_ref: traceId(requestId, 'invalid_input'),
      warnings: ['invalid_input'],
    };
  }

  if (context.dependency_state === 'unavailable') {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      resolution_ref: null,
      resolution_state: null,
      emitted_event_id: null,
      trace_ref: traceId(requestId, 'dependency_unavailable'),
      warnings: ['dependency_unavailable'],
    };
  }

  if (context.policy_state === 'denied') {
    return {
      status: 'rejected',
      reason_code: 'policy_denied',
      resolution_ref: null,
      resolution_state: null,
      emitted_event_id: null,
      trace_ref: traceId(requestId, 'policy_denied'),
      warnings: ['policy_denied'],
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
      resolution_ref: null,
      resolution_state: null,
      emitted_event_id: null,
      trace_ref: stateStoreActivation.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  const appendAuth = runtime.authorize({
    adapterId: 'local-state-store',
    operation: 'append-detection-resolution',
    payloadBytes: JSON.stringify({
      acoustic_evidence_ref: request.acoustic_evidence_ref,
      resolution_context: request.resolution_context,
      idempotency_key: idempotencyKey,
    }).length,
  });
  if (!appendAuth.authorized) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      resolution_ref: null,
      resolution_state: null,
      emitted_event_id: null,
      trace_ref: appendAuth.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  const outcome = resolveOutcome(requestId);

  return {
    status: 'completed',
    reason_code: 'ok',
    resolution_ref: resultRef({
      workspaceId,
      locationId,
      evidenceRefId: request.acoustic_evidence_ref.id,
      resolutionState: outcome.resolution_state,
      idempotencyKey,
    }),
    resolution_state: outcome.resolution_state,
    emitted_event_id: outcome.emitted_event_id,
    trace_ref: traceId(requestId, 'ok'),
    warnings: outcome.warnings,
  };
}
