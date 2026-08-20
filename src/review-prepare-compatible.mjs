import { createHash } from 'node:crypto';

const traceId = (requestId, reasonCode) =>
  `trace-${createHash('sha256').update(JSON.stringify({ requestId, reasonCode })).digest('hex').slice(0, 16)}`;

const resultRef = ({ workspaceId, locationId, clusterId, reviewPolicyId, idempotencyKey }) =>
  `review-proposal-${createHash('sha256').update(JSON.stringify({
    workspaceId,
    locationId,
    clusterId,
    reviewPolicyId,
    idempotencyKey,
  })).digest('hex').slice(0, 16)}`;

function validateRequest(request) {
  if (!request || typeof request !== 'object') return 'invalid_input';
  if (!request.request_id || !request.workspace_id || !request.location_id || !request.idempotency_key) return 'invalid_input';
  if (!request.unknown_cluster_ref?.id) return 'invalid_input';
  if (!request.review_policy?.id) return 'invalid_input';
  const context = request.runtime_context;
  if (!context) return 'invalid_input';
  if (!['resolvable', 'unresolvable'].includes(context.input_reference_state)) return 'invalid_input';
  if (!['available', 'unavailable'].includes(context.dependency_state)) return 'invalid_input';
  if (!['allowed', 'denied'].includes(context.policy_state)) return 'invalid_input';
  return null;
}

export function runReviewPrepareCompatible({ request, runtime }) {
  const invalid = validateRequest(request);
  if (invalid) {
    return {
      status: 'rejected',
      reason_code: 'invalid_input',
      review_proposal_ref: null,
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
      review_proposal_ref: null,
      trace_ref: traceId(requestId, 'invalid_input'),
      warnings: ['invalid_input'],
    };
  }

  if (context.dependency_state === 'unavailable') {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      review_proposal_ref: null,
      trace_ref: traceId(requestId, 'dependency_unavailable'),
      warnings: ['dependency_unavailable'],
    };
  }

  if (context.policy_state === 'denied') {
    return {
      status: 'rejected',
      reason_code: 'policy_denied',
      review_proposal_ref: null,
      trace_ref: traceId(requestId, 'policy_denied'),
      warnings: ['policy_denied'],
    };
  }

  const bundleActivation = runtime.activate({
    adapterId: 'review-package-builder',
    target: 'local',
    configRef: { id: `${workspaceId}:${locationId}:review-package-builder` },
  });
  const ingestActivation = runtime.activate({
    adapterId: 'advisory-response-ingest',
    target: 'local',
    configRef: { id: `${workspaceId}:${locationId}:advisory-response-ingest` },
  });
  const proposalActivation = runtime.activate({
    adapterId: 'review-proposal-store',
    target: 'local',
    configRef: { id: `${workspaceId}:${locationId}:review-proposal-store` },
  });

  for (const activation of [bundleActivation, ingestActivation, proposalActivation]) {
    if (!activation.activated) {
      return {
        status: 'deferred',
        reason_code: 'dependency_unavailable',
        review_proposal_ref: null,
        trace_ref: activation.trace.id,
        warnings: ['dependency_unavailable'],
      };
    }
  }

  const sharedPayload = JSON.stringify({
    unknown_cluster_ref: request.unknown_cluster_ref,
    review_policy: request.review_policy,
    idempotency_key: idempotencyKey,
  }).length;

  const bundleAuth = runtime.authorize({
    adapterId: 'review-package-builder',
    operation: 'build-review-bundle',
    payloadBytes: sharedPayload,
  });
  const ingestAuth = runtime.authorize({
    adapterId: 'advisory-response-ingest',
    operation: 'ingest-advisory-response',
    payloadBytes: sharedPayload,
  });
  const proposalAuth = runtime.authorize({
    adapterId: 'review-proposal-store',
    operation: 'persist-review-proposal',
    payloadBytes: sharedPayload,
  });

  for (const auth of [bundleAuth, ingestAuth, proposalAuth]) {
    if (!auth.authorized) {
      return {
        status: 'deferred',
        reason_code: 'dependency_unavailable',
        review_proposal_ref: null,
        trace_ref: auth.trace.id,
        warnings: ['dependency_unavailable'],
      };
    }
  }

  return {
    status: 'completed',
    reason_code: 'ok',
    review_proposal_ref: resultRef({
      workspaceId,
      locationId,
      clusterId: request.unknown_cluster_ref.id,
      reviewPolicyId: request.review_policy.id,
      idempotencyKey,
    }),
    trace_ref: traceId(requestId, 'ok'),
    warnings: [],
  };
}
