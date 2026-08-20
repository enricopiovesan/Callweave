import { createHash } from 'node:crypto';

const traceId = (requestId, reasonCode) =>
  `trace-${createHash('sha256').update(JSON.stringify({ requestId, reasonCode })).digest('hex').slice(0, 16)}`;

const resultRef = ({ workspaceId, locationId, locationInputId, sourcePolicyId, idempotencyKey }) =>
  `location-profile-${createHash('sha256').update(JSON.stringify({
    workspaceId,
    locationId,
    locationInputId,
    sourcePolicyId,
    idempotencyKey,
  })).digest('hex').slice(0, 16)}`;

function validateRequest(request) {
  if (!request || typeof request !== 'object') return 'invalid_input';
  if (!request.request_id || !request.workspace_id || !request.location_id || !request.idempotency_key) return 'invalid_input';
  if (!request.location_input?.id) return 'invalid_input';
  if (!request.candidate_source_policy?.id) return 'invalid_input';
  const context = request.runtime_context;
  if (!context) return 'invalid_input';
  if (!['resolvable', 'unresolvable'].includes(context.input_reference_state)) return 'invalid_input';
  if (!['available', 'unavailable'].includes(context.dependency_state)) return 'invalid_input';
  if (!['allowed', 'denied'].includes(context.policy_state)) return 'invalid_input';
  return null;
}

export function runLocationInitializeCompatible({ request, runtime }) {
  const invalid = validateRequest(request);
  if (invalid) {
    return {
      status: 'rejected',
      reason_code: 'invalid_input',
      location_profile_ref: null,
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
      location_profile_ref: null,
      trace_ref: traceId(requestId, 'invalid_input'),
      warnings: ['invalid_input'],
    };
  }

  if (context.dependency_state === 'unavailable') {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      location_profile_ref: null,
      trace_ref: traceId(requestId, 'dependency_unavailable'),
      warnings: ['dependency_unavailable'],
    };
  }

  if (context.policy_state === 'denied') {
    return {
      status: 'rejected',
      reason_code: 'policy_denied',
      location_profile_ref: null,
      trace_ref: traceId(requestId, 'policy_denied'),
      warnings: ['policy_denied'],
    };
  }

  const sourceActivation = runtime.activate({
    adapterId: 'occurrence-source-provider',
    target: 'local',
    configRef: { id: `${workspaceId}:${locationId}:occurrence-sources` },
  });
  if (!sourceActivation.activated) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      location_profile_ref: null,
      trace_ref: sourceActivation.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  const privateStoreActivation = runtime.activate({
    adapterId: 'private-location-store',
    target: 'local',
    configRef: { id: `${workspaceId}:${locationId}:private-location-store` },
  });
  if (!privateStoreActivation.activated) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      location_profile_ref: null,
      trace_ref: privateStoreActivation.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  const sourceAuth = runtime.authorize({
    adapterId: 'occurrence-source-provider',
    operation: 'import-occurrence-facts',
    payloadBytes: JSON.stringify({
      location_input: request.location_input,
      candidate_source_policy: request.candidate_source_policy,
    }).length,
  });
  if (!sourceAuth.authorized) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      location_profile_ref: null,
      trace_ref: sourceAuth.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  const persistAuth = runtime.authorize({
    adapterId: 'private-location-store',
    operation: 'persist-location-profile',
    payloadBytes: JSON.stringify({
      location_input: request.location_input,
      candidate_source_policy: request.candidate_source_policy,
      idempotency_key: idempotencyKey,
    }).length,
  });
  if (!persistAuth.authorized) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      location_profile_ref: null,
      trace_ref: persistAuth.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  return {
    status: 'completed',
    reason_code: 'ok',
    location_profile_ref: resultRef({
      workspaceId,
      locationId,
      locationInputId: request.location_input.id,
      sourcePolicyId: request.candidate_source_policy.id,
      idempotencyKey,
    }),
    trace_ref: traceId(requestId, 'ok'),
    warnings: [],
  };
}
