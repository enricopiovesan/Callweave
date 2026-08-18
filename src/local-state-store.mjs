import { createHash } from 'node:crypto';
import { mkdir, open, readFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

const idFor = value => `state-${createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16)}`;

/** Durable application-owned append-only state adapter. */
export class LocalStateStore {
  #path; #records = []; #idempotency = new Map();

  static async open(root, filename = 'state/events.jsonl') {
    const path = safePath(root, filename);
    const store = new LocalStateStore(path);
    try {
      const lines = (await readFile(path, 'utf8')).split('\n').filter(Boolean);
      for (const line of lines) store.#restore(JSON.parse(line));
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    return store;
  }

  constructor(path) { this.#path = path; }

  async append({ type, payload, idempotencyKey, timestamp }) {
    if (!type || !payload?.id || !idempotencyKey || !timestamp) throw new Error('type, payload.id, idempotencyKey, and timestamp are required');
    const existing = this.#idempotency.get(idempotencyKey);
    if (existing) return { ...existing, replayed: true };
    const previous = this.#records.filter(record => record.type === type && record.payload.id === payload.id).at(-1);
    const record = Object.freeze({ id: idFor({ type, payload, idempotencyKey, timestamp }), type, payload: Object.freeze({ ...payload }), idempotency_key: idempotencyKey, timestamp, version: (previous?.version ?? 0) + 1, previous_id: previous?.id ?? null });
    await mkdir(dirname(this.#path), { recursive: true });
    const handle = await open(this.#path, 'a');
    try { await handle.writeFile(`${JSON.stringify(record)}\n`); await handle.sync(); } finally { await handle.close(); }
    this.#restore(record);
    return { ...record, replayed: false };
  }

  resolve(type, id) { return this.#records.filter(record => record.type === type && record.payload.id === id).at(-1) ?? null; }
  records(type = null) { return this.#records.filter(record => !type || record.type === type).map(record => ({ ...record })); }
  #restore(record) { if (!record?.id || !record?.idempotency_key || this.#idempotency.has(record.idempotency_key)) throw new Error('invalid or duplicate durable state record'); this.#records.push(Object.freeze(record)); this.#idempotency.set(record.idempotency_key, record); }
}

function safePath(root, filename) { const base = resolve(root); const path = resolve(base, filename); if (relative(base, path).startsWith(`..${sep}`) || path === base) throw new Error('state path escapes configured root'); return path; }
