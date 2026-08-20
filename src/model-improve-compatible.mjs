import { createHash } from 'node:crypto';

const traceId = (requestId, reasonCode) =>
  `trace-${createHash('sha256').update(JSON.stringify({ requestId, reasonCode })).digest('hex').slice(0, 16)}`;

const resultRef = ({ workspaceId, locationId, trainingRequestId, releasePolicyId, idempotencyKey }) =>
  `model-release-${createHash('sha256').update(JSON.stringify({
    workspaceId,
    locationId,
    trainingRequestId,
    releasePolicyId,
    idempotencyKey,
  })).digest('hex').slice(0, 16)}`;

function validateRequest(request) {
  if (!request || typeof request !== 'object') return 'invalid_input';
  if (!request.request_id || !request.workspace_id || !request.location_id || !request.idempotency_key) return 'invalid_input';
  if (!request.training_request?.id) return 'invalid_input';
  if (!request.model_release_policy?.id) return 'invalid_input';
  const context = request.runtime_context;
  if (!context) return 'invalid_input';
  if (!['resolvable', 'unresolvable'].includes(context.input_reference_state)) return 'invalid_input';
  if (!['available', 'unavailable'].includes(context.dependency_state)) return 'invalid_input';
  if (!['allowed', 'denied'].includes(context.policy_state)) return 'invalid_input';
  return null;
}

export function runModelImproveCompatible({ request, runtime }) {
  const invalid = validateRequest(request);
  if (invalid) {
    return {
      status: 'rejected',
      reason_code: 'invalid_input',
      model_release_ref: null,
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
      model_release_ref: null,
      trace_ref: traceId(requestId, 'invalid_input'),
      warnings: ['invalid_input'],
    };
  }

  if (context.dependency_state === 'unavailable') {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      model_release_ref: null,
      trace_ref: traceId(requestId, 'dependency_unavailable'),
      warnings: ['dependency_unavailable'],
    };
  }

  if (context.policy_state === 'denied') {
    return {
      status: 'rejected',
      reason_code: 'policy_denied',
      model_release_ref: null,
      trace_ref: traceId(requestId, 'policy_denied'),
      warnings: ['policy_denied'],
    };
  }

  const trainerActivation = runtime.activate({
    adapterId: 'local-model-trainer',
    target: 'local',
    configRef: { id: `${workspaceId}:${locationId}:model-trainer` },
  });
  const evaluatorActivation = runtime.activate({
    adapterId: 'local-model-evaluator',
    target: 'local',
    configRef: { id: `${workspaceId}:${locationId}:model-evaluator` },
  });
  const releaseActivation = runtime.activate({
    adapterId: 'local-model-release-store',
    target: 'local',
    configRef: { id: `${workspaceId}:${locationId}:model-release-store` },
  });

  for (const activation of [trainerActivation, evaluatorActivation, releaseActivation]) {
    if (!activation.activated) {
      return {
        status: 'deferred',
        reason_code: 'dependency_unavailable',
        model_release_ref: null,
        trace_ref: activation.trace.id,
        warnings: ['dependency_unavailable'],
      };
    }
  }

  const sharedPayload = JSON.stringify({
    training_request: request.training_request,
    model_release_policy: request.model_release_policy,
    idempotency_key: idempotencyKey,
  }).length;

  const trainAuth = runtime.authorize({
    adapterId: 'local-model-trainer',
    operation: 'train-local-adapter',
    payloadBytes: sharedPayload,
  });
  const evalAuth = runtime.authorize({
    adapterId: 'local-model-evaluator',
    operation: 'evaluate-local-adapter',
    payloadBytes: sharedPayload,
  });
  const releaseAuth = runtime.authorize({
    adapterId: 'local-model-release-store',
    operation: 'publish-or-rollback-local-release',
    payloadBytes: sharedPayload,
  });

  for (const auth of [trainAuth, evalAuth, releaseAuth]) {
    if (!auth.authorized) {
      return {
        status: 'deferred',
        reason_code: 'dependency_unavailable',
        model_release_ref: null,
        trace_ref: auth.trace.id,
        warnings: ['dependency_unavailable'],
      };
    }
  }

  return {
    status: 'completed',
    reason_code: 'ok',
    model_release_ref: resultRef({
      workspaceId,
      locationId,
      trainingRequestId: request.training_request.id,
      releasePolicyId: request.model_release_policy.id,
      idempotencyKey,
    }),
    trace_ref: traceId(requestId, 'ok'),
    warnings: [],
  };
}
