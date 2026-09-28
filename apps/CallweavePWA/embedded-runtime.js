import { BundleEmbedder, FetchBundleLoader } from './vendor/traverse-embedder-web/index.js';
import { startRecording, stopRecording } from './web-recording.js';
import { saveLocalRecording } from './local-recordings.js';

const manifestPath = './runtime/app.manifest.json';

export class CallweaveEmbeddedRuntime {
  #embedder = null;
  #sessionId = null;
  #pendingCapture = null;
  #onEvent;
  #onRecordingSaved;

  constructor({ onEvent, onRecordingSaved }) {
    this.#onEvent = onEvent;
    this.#onRecordingSaved = onRecordingSaved;
  }

  async initialize() {
    if (this.#embedder) return;
    const embedder = await BundleEmbedder.init({ manifestPath, loader: new FetchBundleLoader(), platform: 'browser' });
    embedder.registerHostConnectorAdapter('audio.permission.request', async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return { resultClass: 'succeeded', payload: { permission_state: 'granted' } };
    });
    embedder.registerHostConnectorAdapter('audio.capture', request => this.#capture(request));
    embedder.subscribe(event => {
      if (event.session_id) this.#sessionId = event.session_id;
      this.#onEvent?.(event);
    });
    this.#embedder = embedder;
  }

  async send(command) {
    await this.initialize();
    const result = this.#embedder.submit({
      kind: 'app_command', command,
      payload: { max_duration_ms: 3_600_000, max_bytes: 128 * 1024 * 1024 },
      sessionId: this.#sessionId,
    });
    if (result.status !== 'accepted') throw new Error(result.error?.message ?? 'Listening could not start.');
  }

  // A Traverse application session is intentionally immutable after its
  // terminal result. A new foreground recording therefore gets a fresh local
  // runtime instance rather than attempting to re-use a completed session.
  resetSession() {
    if (this.#pendingCapture) throw new Error('A recording is still in progress.');
    this.#embedder?.shutdown();
    this.#embedder = null;
    this.#sessionId = null;
  }

  async stop() {
    const pending = this.#pendingCapture;
    if (!pending) return;
    try {
      const stopped = await stopRecording();
      const durationSeconds = Math.max(1, Math.round((Date.now() - pending.startedAt) / 1000));
      const recording = {
        id: crypto.randomUUID(), startedAt: pending.startedAt, durationSeconds,
        audio: stopped.blob, day: pending.formatDay(pending.startedAt), time: pending.formatTime(pending.startedAt),
      };
      if (!stopped.blob?.size) {
        pending.resolve({ resultClass: 'failed', payload: { code: 'empty_recording' } });
      } else {
        await saveLocalRecording(recording);
        await this.#onRecordingSaved?.(recording);
        pending.resolve({ resultClass: 'succeeded', payload: { artifact_ref: recording.id } });
      }
    } catch (error) {
      pending.resolve({ resultClass: 'failed', payload: { code: 'local_storage_failed' } });
      console.error('Callweave could not save this local recording.', error);
    } finally {
      this.#pendingCapture = null;
    }
  }

  async #capture(request) {
    if (this.#pendingCapture) return { resultClass: 'failed', payload: { code: 'capture_in_progress' } };
    const startedAt = Date.now();
    await startRecording();
    return new Promise(resolve => {
      this.#pendingCapture = {
        resolve, startedAt,
        formatDay: stamp => new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(stamp),
        formatTime: stamp => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(stamp),
      };
    });
  }
}
