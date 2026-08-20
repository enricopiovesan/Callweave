import { createHash } from 'node:crypto';

const traceId = (requestId, reasonCode) =>
  `trace-${createHash('sha256').update(JSON.stringify({ requestId, reasonCode })).digest('hex').slice(0, 16)}`;

const resultRef = ({ workspaceId, locationId, evidenceRefsId, clusteringPolicyId, idempotencyKey }) =>
  `unknown-cluster-${createHash('sha256').update(JSON.stringify({
    workspaceId,
    locationId,
    evidenceRefsId,
    clusteringPolicyId,
    idempotencyKey,
  })).digest('hex').slice(0, 16)}`;

function validateRequest(request) {
  if (!request || typeof request !== 'object') return 'invalid_input';
  if (!request.request_id || !request.workspace_id || !request.location_id || !request.idempotency_key) return 'invalid_input';
  if (!request.unknown_evidence_refs?.id || !request.clustering_policy?.id) return 'invalid_input';
  const context = request.runtime_context;
  if (!context) return 'invalid_input';
  if (!['resolvable', 'unresolvable'].includes(context.input_reference_state)) return 'invalid_input';
  if (!['available', 'unavailable'].includes(context.dependency_state)) return 'invalid_input';
  if (!['allowed', 'denied'].includes(context.policy_state)) return 'invalid_input';
  return null;
}

export function runUnknownOrganizeCompatible({ request, runtime }) {
  const invalid = validateRequest(request);
  if (invalid) {
    return {
      status: 'rejected',
      reason_code: 'invalid_input',
      unknown_cluster_ref: null,
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
      unknown_cluster_ref: null,
      trace_ref: traceId(requestId, 'invalid_input'),
      warnings: ['invalid_input'],
    };
  }

  if (context.dependency_state === 'unavailable') {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      unknown_cluster_ref: null,
      trace_ref: traceId(requestId, 'dependency_unavailable'),
      warnings: ['dependency_unavailable'],
    };
  }

  if (context.policy_state === 'denied') {
    return {
      status: 'rejected',
      reason_code: 'policy_denied',
      unknown_cluster_ref: null,
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
      unknown_cluster_ref: null,
      trace_ref: stateStoreActivation.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  const appendAuth = runtime.authorize({
    adapterId: 'local-state-store',
    operation: 'append-unknown-cluster',
    payloadBytes: JSON.stringify({
      unknown_evidence_refs: request.unknown_evidence_refs,
      clustering_policy: request.clustering_policy,
      idempotency_key: idempotencyKey,
    }).length,
  });
  if (!appendAuth.authorized) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      unknown_cluster_ref: null,
      trace_ref: appendAuth.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  return {
    status: 'completed',
    reason_code: 'ok',
    unknown_cluster_ref: resultRef({
      workspaceId,
      locationId,
      evidenceRefsId: request.unknown_evidence_refs.id,
      clusteringPolicyId: request.clustering_policy.id,
      idempotencyKey,
    }),
    trace_ref: traceId(requestId, 'ok'),
    warnings: [],
  };
}
