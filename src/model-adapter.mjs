import crypto from 'node:crypto';
import { executeSyntheticModel } from './model-execution-fixture.mjs';

/**
 * Provider-neutral execution port. Traverse will supply the production
 * implementation; tests can inject the deterministic fixture below.
 */
export function createModelAdapter({ execute }) {
  if (typeof execute !== 'function') throw new TypeError('execute must be a function');
  return Object.freeze({
    async infer({ request, manifest, target = 'wasm32-wasi', signal }) {
      if (signal?.aborted) return { status: 'cancelled', request_id: request?.request_id ?? null };
      return execute({ request, manifest, target, signal });
    },
  });
}

export function createSyntheticModelAdapter() {
  return createModelAdapter({ execute: ({ request, manifest, target }) => executeSyntheticModel({ request, manifest, target }) });
}

export function sha256Digest(bytes) {
  return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
}
