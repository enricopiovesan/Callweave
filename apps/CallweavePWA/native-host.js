/**
 * Read-only presentation boundary for an optional installed Callweave host.
 * The host owns permissions, capture, background execution, and audio data.
 */
export function nativeHostFromBridge(host = globalThis) {
  const bridge = host?.CallweaveNativeHost;
  if (!bridge || typeof bridge !== 'object') return null;
  return bridge;
}

export async function recordingAvailability(bridge) {
  if (!bridge || typeof bridge.getRecordingAvailability !== 'function') {
    return Object.freeze({ available: false, reason: 'not_installed' });
  }
  try {
    const value = await bridge.getRecordingAvailability();
    return Object.freeze({ available: value?.available === true, reason: value?.reason ?? null });
  } catch {
    return Object.freeze({ available: false, reason: 'unavailable' });
  }
}

export function subscribeRecordingEvents(bridge, listener) {
  if (!bridge || typeof bridge.subscribeRecordingEvents !== 'function') return () => {};
  const unsubscribe = bridge.subscribeRecordingEvents(listener);
  return typeof unsubscribe === 'function' ? unsubscribe : () => {};
}

/**
 * An installed host may own authenticated Runtime event transport. The PWA
 * receives read-only events and never handles bearer credentials in a URL.
 */
export function subscribeRuntimeEvents(bridge, selector, listener, onError) {
  if (!bridge || typeof bridge.subscribeRuntimeEvents !== 'function') return null;
  try {
    const unsubscribe = bridge.subscribeRuntimeEvents(selector, listener, onError);
    return typeof unsubscribe === 'function' ? unsubscribe : () => {};
  } catch {
    onError?.();
    return () => {};
  }
}

/**
 * Returns opaque, host-authored input for Traverse's `request_capture` command.
 * The web app does not create IDs, choose a source profile, or set duration.
 */
export async function captureRequestPayload(bridge) {
  if (!bridge || typeof bridge.getCaptureRequestPayload !== 'function') return null;
  try {
    const payload = await bridge.getCaptureRequestPayload();
    return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
  } catch {
    return null;
  }
}
