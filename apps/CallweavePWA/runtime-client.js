/**
 * Transport-only boundary for a host-provided Traverse runtime.
 *
 * This module deliberately does not interpret runtime state, choose commands,
 * or persist application data. A packaged/embedded host supplies the endpoint
 * configuration; the published static PWA has no runtime endpoint by default.
 */
export class TraverseRuntimeClient {
  #config;
  #fetch;
  #webSocket;

  constructor(config, { fetchImpl = globalThis.fetch, webSocketImpl = globalThis.WebSocket } = {}) {
    if (!config?.baseUrl || !config.workspaceId || !config.appId) {
      throw new Error('Traverse runtime configuration requires baseUrl, workspaceId, and appId');
    }
    this.#config = Object.freeze({
      baseUrl: normalizeBaseUrl(config.baseUrl),
      workspaceId: config.workspaceId,
      appId: config.appId,
      token: config.token ?? null,
    });
    this.#fetch = fetchImpl;
    this.#webSocket = webSocketImpl;
  }

  async health() {
    if (typeof this.#fetch !== 'function') return unavailable('fetch_unavailable');
    try {
      const response = await this.#fetch(`${this.#config.baseUrl}/healthz`, {
        headers: this.#headers(),
        credentials: 'omit',
      });
      if (!response.ok) return unavailable(`http_${response.status}`);
      const payload = await response.json();
      if (payload?.status !== 'ok' || payload?.api_version !== 'v1') return unavailable('invalid_health_envelope');
      return Object.freeze({
        status: 'connected',
        workspaceId: payload.workspace_default ?? this.#config.workspaceId,
        apiVersion: payload.api_version,
      });
    } catch {
      return unavailable('unreachable');
    }
  }

  /**
   * Opens the governed browser-subscription transport for one request or
   * execution. Message ordering and meaning remain owned by Traverse.
   */
  subscribe({ requestId, executionId, onMessage, onClose }) {
    if ((requestId && executionId) || (!requestId && !executionId)) {
      throw new Error('Provide exactly one of requestId or executionId');
    }
    if (typeof this.#webSocket !== 'function') throw new Error('WebSocket is unavailable');
    const socket = new this.#webSocket(this.eventsUrl());
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({
        type: 'subscribe',
        mode: 'browser_subscription',
        ...(requestId ? { request_id: requestId } : { execution_id: executionId }),
      }));
    });
    socket.addEventListener('message', event => onMessage?.(safeJson(event.data)));
    socket.addEventListener('close', event => onClose?.({ code: event.code, reason: event.reason }));
    return socket;
  }

  eventsUrl() {
    const url = new URL(this.#config.baseUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = `/v1/workspaces/${encodeURIComponent(this.#config.workspaceId)}/apps/${encodeURIComponent(this.#config.appId)}/events`;
    url.search = '';
    return url.toString();
  }

  #headers() {
    return this.#config.token ? { Authorization: `Bearer ${this.#config.token}` } : {};
  }
}

export function runtimeConfigFromHost(host = globalThis) {
  const config = host?.CallweaveRuntimeConfig;
  if (!config || typeof config !== 'object') return null;
  return config;
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Traverse runtime baseUrl must use HTTP or HTTPS');
  return url.toString().replace(/\/$/, '');
}

function unavailable(reason) {
  return Object.freeze({ status: 'unavailable', reason });
}

function safeJson(value) {
  try { return JSON.parse(value); } catch { return Object.freeze({ type: 'invalid_message' }); }
}
