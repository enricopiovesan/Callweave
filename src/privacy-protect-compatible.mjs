import { createHash } from 'node:crypto';

const traceId = (requestId, reasonCode) =>
  `trace-${createHash('sha256').update(JSON.stringify({ requestId, reasonCode })).digest('hex').slice(0, 16)}`;

const resultRef = ({ workspaceId, locationId, assetRefsId, privacyPolicyId, idempotencyKey }) =>
  `sanitized-asset-set-${createHash('sha256').update(JSON.stringify({
    workspaceId,
    locationId,
    assetRefsId,
    privacyPolicyId,
    idempotencyKey,
  })).digest('hex').slice(0, 16)}`;

function validateRequest(request) {
  if (!request || typeof request !== 'object') return 'invalid_input';
  if (!request.request_id || !request.workspace_id || !request.location_id || !request.idempotency_key) return 'invalid_input';
  if (!request.asset_refs?.id || !request.privacy_policy?.id) return 'invalid_input';
  const context = request.runtime_context;
  if (!context) return 'invalid_input';
  if (!['resolvable', 'unresolvable'].includes(context.input_reference_state)) return 'invalid_input';
  if (!['available', 'unavailable'].includes(context.dependency_state)) return 'invalid_input';
  if (!['allowed', 'denied'].includes(context.policy_state)) return 'invalid_input';
  return null;
}

/**
 * Thin host-owned compatible execution path for callweave.privacy-protect.
 * It enforces declared adapter activation/authorization only; it does not
 * implement privacy detection or export logic inside the wrapper.
 */
export function runPrivacyProtectCompatible({ request, runtime }) {
  const invalid = validateRequest(request);
  if (invalid) {
    return {
      status: 'rejected',
      reason_code: 'invalid_input',
      sanitized_asset_set_ref: null,
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
      sanitized_asset_set_ref: null,
      trace_ref: traceId(requestId, 'invalid_input'),
      warnings: ['invalid_input'],
    };
  }

  if (context.dependency_state === 'unavailable') {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      sanitized_asset_set_ref: null,
      trace_ref: traceId(requestId, 'dependency_unavailable'),
      warnings: ['dependency_unavailable'],
    };
  }

  if (context.policy_state === 'denied') {
    return {
      status: 'rejected',
      reason_code: 'policy_denied',
      sanitized_asset_set_ref: null,
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
      sanitized_asset_set_ref: null,
      trace_ref: modelRuntimeActivation.trace.id,
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
      sanitized_asset_set_ref: null,
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
      sanitized_asset_set_ref: null,
      trace_ref: stateStoreActivation.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  const protectAuth = runtime.authorize({
    adapterId: 'local-model-runtime',
    operation: 'detect-speech-risk',
    payloadBytes: JSON.stringify({
      asset_refs: request.asset_refs,
      privacy_policy: request.privacy_policy,
      idempotency_key: idempotencyKey,
    }).length,
  });
  if (!protectAuth.authorized) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      sanitized_asset_set_ref: null,
      trace_ref: protectAuth.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  const storeAuth = runtime.authorize({
    adapterId: 'local-object-store',
    operation: 'store-sanitized-assets',
    payloadBytes: JSON.stringify({
      asset_refs: request.asset_refs,
      privacy_policy: request.privacy_policy,
      idempotency_key: idempotencyKey,
    }).length,
  });
  if (!storeAuth.authorized) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      sanitized_asset_set_ref: null,
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
      asset_refs: request.asset_refs,
      privacy_policy: request.privacy_policy,
      idempotency_key: idempotencyKey,
    }).length,
  });
  if (!appendAuth.authorized) {
    return {
      status: 'deferred',
      reason_code: 'dependency_unavailable',
      sanitized_asset_set_ref: null,
      trace_ref: appendAuth.trace.id,
      warnings: ['dependency_unavailable'],
    };
  }

  return {
    status: 'completed',
    reason_code: 'ok',
    sanitized_asset_set_ref: resultRef({
      workspaceId,
      locationId,
      assetRefsId: request.asset_refs.id,
      privacyPolicyId: request.privacy_policy.id,
      idempotencyKey,
    }),
    trace_ref: traceId(requestId, 'ok'),
    warnings: [],
  };
}
