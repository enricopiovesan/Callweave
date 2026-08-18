import { stableDigest } from './stable-id.mjs';

/**
 * Pure append-only state kernel. A future host connector persists and reloads
 * its event log; this module has no filesystem or network authority.
 */
export class AppendOnlyState {
  #records = [];
  #idempotency = new Map();

  append({ type, payload, idempotencyKey, timestamp }) {
    if (!type || !payload || !idempotencyKey || !timestamp) throw new Error('type, payload, idempotencyKey, and timestamp are required');
    const existing = this.#idempotency.get(idempotencyKey);
    if (existing) return { ...existing, replayed: true };
    const prior = this.#records.filter(record => record.type === type && record.payload.id === payload.id);
    const version = prior.length + 1;
    const record = Object.freeze({
      id: `${type}-${stableDigest({ type, payload, idempotencyKey, timestamp }).slice(0, 16)}`,
      type,
      version,
      idempotency_key: idempotencyKey,
      timestamp,
      payload: Object.freeze({ ...payload }),
      previous_id: prior.at(-1)?.id ?? null,
    });
    this.#records.push(record); this.#idempotency.set(idempotencyKey, record);
    return { ...record, replayed: false };
  }

  records(type = null) { return this.#records.filter(record => !type || record.type === type).map(record => ({ ...record })); }
  latest(type, id) { return this.#records.filter(record => record.type === type && record.payload.id === id).at(-1) ?? null; }
  snapshot() { return this.records(); }
}
