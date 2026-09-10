/**
 * Presentation-only formatting for events already ordered and authored by
 * Traverse. This module does not derive an application state or select a
 * transition; it only makes a received event safe to render.
 */
export function runtimeEventView(event) {
  const value = event && typeof event === 'object' ? event : {};
  const type = text(value.type, 'runtime_event');
  const state = text(value.state ?? value.current_state ?? value.data?.state, 'Awaiting runtime update');
  const sequence = Number.isFinite(value.sequence) ? `#${value.sequence}` : null;
  const detail = text(value.message ?? value.detail ?? value.data?.message, '');
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
