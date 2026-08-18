import { createHash } from 'node:crypto';

const traceId = value => `trace-${createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16)}`;

/**
 * Application-owned adapter activation boundary. It deliberately mirrors the
 * approved Traverse connector requirements without granting a WASM guest any
 * host access. A future Traverse binding can replace this class at the edge.
 */
export class HostAdapterRuntime {
  #definitions;
  #active = new Map();

  constructor(adapterDocument) {
    if (!adapterDocument?.adapters || !Array.isArray(adapterDocument.adapters)) throw new Error('adapter document is invalid');
    this.#definitions = new Map(adapterDocument.adapters.map(adapter => [adapter.id, adapter]));
  }

  activate({ adapterId, target, configRef }) {
    const definition = this.#definitions.get(adapterId);
    if (!definition) return this.#failure(adapterId, 'unbound_adapter');
    if (!target || !configRef?.id) return this.#failure(adapterId, 'unconfigured_adapter');
    const activation = Object.freeze({ adapter_id: adapterId, target, config_ref: configRef.id, authority: definition.authority });
    this.#active.set(adapterId, activation);
    return { activated: true, activation, trace: this.#trace(adapterId, 'activated') };
  }

  authorize({ adapterId, operation, payloadBytes = 0, limitBytes = 1_000_000 }) {
    if (!this.#definitions.has(adapterId)) return this.#failure(adapterId, 'unbound_adapter');
    if (!this.#active.has(adapterId)) return this.#failure(adapterId, 'inactive_adapter');
    if (!operation) return this.#failure(adapterId, 'invalid_operation');
    if (!Number.isInteger(payloadBytes) || payloadBytes < 0 || payloadBytes > limitBytes) return this.#failure(adapterId, 'bounded_io_exceeded');
    return { authorized: true, activation: this.#active.get(adapterId), trace: this.#trace(adapterId, 'authorized') };
  }

  #failure(adapterId, reason) { return { authorized: false, reason, trace: this.#trace(adapterId, reason) }; }
  #trace(adapterId, result) { return Object.freeze({ id: traceId({ adapterId, result }), adapter_id: adapterId, result }); }
}
