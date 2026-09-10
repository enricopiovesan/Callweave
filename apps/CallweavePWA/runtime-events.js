/**
 * Presentation-only formatting for events already ordered and authored by
 * Traverse. This module does not derive an application state or select a
 * transition; it only makes a received event safe to render.
 */
export function runtimeEventView(event) {
  const value = event && typeof event === 'object' ? event : {};
  // Traverse browser subscriptions carry their ordered message under `message`.
  const envelope = value.message && typeof value.message === 'object' ? value.message : value;
  // Rust's externally tagged subscription enum is serialized as
  // `{ Lifecycle: {...} }`, `{ StreamTerminal: {...} }`, etc.
  const message = envelope.kind ? envelope : Object.values(envelope).find(candidate => candidate && typeof candidate === 'object') ?? envelope;
  const stateEvent = message.state_event && typeof message.state_event === 'object' ? message.state_event : {};
  const result = message.result && typeof message.result === 'object' ? message.result : {};
  const trace = message.trace && typeof message.trace === 'object' ? message.trace : {};
  const type = text(message.kind ?? value.type ?? value.signal, 'runtime_event');
  const state = text(
    stateEvent.state ?? message.status ?? result.status ?? trace.terminal_outcome?.runtime_status ?? trace.execution?.status ?? message.state ?? value.state ?? value.current_state ?? value.data?.state,
    'Awaiting runtime update',
  );
  const sequence = Number.isFinite(message.sequence) ? `#${message.sequence}` : null;
  const detail = text(message.message ?? value.detail ?? value.data?.message, '');
  return Object.freeze({ type, state, sequence, detail, receivedAt: new Date().toISOString() });
}

export function commandResultView(result) {
  const value = result && typeof result === 'object' ? result : {};
  return Object.freeze({
    state: text(value.state ?? value.current_state, 'Request accepted'),
    sessionId: text(value.session_id ?? value.sessionId, ''),
    executionId: text(value.execution_id ?? value.executionId, ''),
  });
}

function text(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
