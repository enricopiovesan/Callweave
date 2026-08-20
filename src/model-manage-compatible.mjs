import { createHash } from 'node:crypto';

const traceId = (requestId, reasonCode) =>
  `trace-${createHash('sha256').update(JSON.stringify({ requestId, reasonCode })).digest('hex').slice(0, 16)}`;

const resultRef = ({ workspaceId, locationId, modelArtifactId, modelPolicyId, idempotencyKey }) =>
  `model-availability-${createHash('sha256').update(JSON.stringify({
    workspaceId,
    locationId,
    modelArtifactId,
    modelPolicyId,
    idempotencyKey,
  })).digest('hex').slice(0, 16)}`;

function validateRequest(request) {
  if (!request || typeof request !== 'object') return 'invalid_input';
  if (!request.request_id || !request.workspace_id || !request.location_id || !request.idempotency_key) return 'invalid_input';
  if (!request.model_artifact?.id || !request.model_policy?.id) return 'invalid_input';
  const context = request.runtime_context;
  if (!context) return 'invalid_input';
  if (!['resolvable', 'unresolvable'].includes(context.input_reference_state)) return 'invalid_input';
  if (!['available', 'unavailable'].includes(context.dependency_state)) return 'invalid_input';
  if (!['allowed', 'denied'].includes(context.policy_state)) return 'invalid_input';
  return null;
}

/**
 * Thin host-owned compatible execution path for callweave.model-manage.
 * It enforces declared adapter activation/authorization only; it does not
 * embed model-provider logic or business rules beyond contract state mapping.
 */
export function runModelManageCompatible({ request, runtime }) {
  const invalid = validateRequest(request);
  if (invalid) {
    return {
      status: 'rejected',
      reason_code: 'invalid_input',
      model_availability_ref: null,
      trace_ref: traceId(request?.request_id ?? 'missing', 'invalid_input'),
      warnings: ['invalid_input'],
    };
  }

  const { request_id: requestId, workspace_id: workspaceId, location_id: locationId, idempotency_key: idempotencyKey } = request;
  const context = request.runtime_context;

  if (context.input_reference_state === 'unresolvable') {
    return {
      status: 'rejected',
      reason_code: 'invalid_input',
      model_availability_ref: null,
      trace_ref: traceId(requestId, 'invalid_input'),
      warnings: ['invalid_input'],
    };
  }

  if (context.dependency_state === 'unavailable') {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      model_availability_ref: null,
      trace_ref: traceId(requestId, 'dependency_unavailable'),
      warnings: ['dependency_unavailable'],
    };
  }

  if (context.policy_state === 'denied') {
    return {
      status: 'rejected',
      reason_code: 'policy_denied',
      model_availability_ref: null,
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
      model_availability_ref: null,
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
      model_availability_ref: null,
      trace_ref: stateStoreActivation.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  const modelAuth = runtime.authorize({
    adapterId: 'local-model-runtime',
    operation: 'verify-cache-select',
    payloadBytes: JSON.stringify({
      model_artifact: request.model_artifact,
      model_policy: request.model_policy,
      idempotency_key: idempotencyKey,
    }).length,
  });
  if (!modelAuth.authorized) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      model_availability_ref: null,
      trace_ref: modelAuth.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  const appendAuth = runtime.authorize({
    adapterId: 'local-state-store',
    operation: 'append',
    payloadBytes: JSON.stringify({
      workspace_id: workspaceId,
      location_id: locationId,
      model_artifact: request.model_artifact,
      model_policy: request.model_policy,
      idempotency_key: idempotencyKey,
    }).length,
  });
  if (!appendAuth.authorized) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      model_availability_ref: null,
      trace_ref: appendAuth.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  return {
    status: 'completed',
    reason_code: 'ok',
    model_availability_ref: resultRef({
      workspaceId,
      locationId,
      modelArtifactId: request.model_artifact.id,
      modelPolicyId: request.model_policy.id,
      idempotencyKey,
    }),
    trace_ref: traceId(requestId, 'ok'),
    warnings: [],
  };
}
