/**
 * Spec 140 browser host adapter for `traverse.audio-input`.
 *
 * Implements WIT `traverse:audio-input@1.0.0` capture semantics behind the
 * Spec 137 command envelope. Permission/gesture handling stays inside this
 * host module; public results expose only opaque `artifact_ref` /
 * `permission_state` values. Captured bytes are staged through Spec 138/140
 * `stageArtifact` (never paths or URLs).
 */
import { AUDIO_PERMISSION_REQUEST_OPERATION } from "./hostConnectorCommand.js";
export { AUDIO_PERMISSION_REQUEST_OPERATION };
function asRecord(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    return value;
}
function failed(code, message) {
    return {
        resultClass: code === "cancelled" ? "cancelled" : "failed",
        payload: { error_code: code, message },
    };
}
function defaultPermissionDriver() {
    return {
        async status() {
            const permissions = globalThis.navigator?.permissions;
            if (!permissions || typeof permissions.query !== "function") {
                return "unavailable";
            }
            try {
                const result = await permissions.query({
                    name: "microphone",
                });
                if (result.state === "granted") {
                    return "granted";
                }
                if (result.state === "denied") {
                    return "denied";
                }
                return "prompt_required";
            }
            catch {
                return "unavailable";
            }
        },
        async request() {
            const mediaDevices = globalThis.navigator?.mediaDevices;
            if (!mediaDevices || typeof mediaDevices.getUserMedia !== "function") {
                return "unavailable";
            }
            try {
                const stream = await mediaDevices.getUserMedia({ audio: true });
                for (const track of stream.getTracks()) {
                    track.stop();
                }
                return "granted";
            }
            catch (error) {
                const name = error instanceof DOMException ? error.name : "";
                if (name === "NotAllowedError" || name === "SecurityError") {
                    return "denied";
                }
                return "unavailable";
            }
        },
    };
}
function defaultCaptureDriver() {
    return {
        async capture(args) {
            const mediaDevices = globalThis.navigator?.mediaDevices;
            const Recorder = globalThis.MediaRecorder;
            if (!mediaDevices ||
                typeof mediaDevices.getUserMedia !== "function" ||
                typeof Recorder !== "function") {
                throw Object.assign(new Error("browser audio capture unavailable"), {
                    code: "unavailable",
                });
            }
            if (args.signal.aborted) {
                throw Object.assign(new Error("capture cancelled"), { code: "cancelled" });
            }
            const stream = await mediaDevices.getUserMedia({ audio: true });
            const chunks = [];
            let size = 0;
            const recorder = new Recorder(stream);
            return await new Promise((resolve, reject) => {
                const finish = (error) => {
                    for (const track of stream.getTracks()) {
                        track.stop();
                    }
                    if (error) {
                        reject(error);
                    }
                };
                const onAbort = () => {
                    try {
                        if (recorder.state !== "inactive") {
                            recorder.stop();
                        }
                    }
                    catch {
                        // ignore
                    }
                    finish(Object.assign(new Error("capture cancelled"), {
                        code: "cancelled",
                    }));
                };
                args.signal.addEventListener("abort", onAbort, { once: true });
                recorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        size += event.data.size;
                        if (size > args.maxBytes) {
                            try {
                                recorder.stop();
                            }
                            catch {
                                // ignore
                            }
                            finish(Object.assign(new Error("capture exceeds max_bytes"), {
                                code: "input_limit_exceeded",
                            }));
                            return;
                        }
                        chunks.push(event.data);
                    }
                };
                recorder.onerror = () => {
                    finish(Object.assign(new Error("MediaRecorder failed"), {
                        code: "unavailable",
                    }));
                };
                recorder.onstop = () => {
                    args.signal.removeEventListener("abort", onAbort);
                    if (args.signal.aborted) {
                        return;
                    }
                    void (async () => {
                        try {
                            const blob = new Blob(chunks);
                            const buffer = await blob.arrayBuffer();
                            resolve(new Uint8Array(buffer));
                        }
                        catch {
                            finish(Object.assign(new Error("failed to materialize recording"), {
                                code: "unavailable",
                            }));
                        }
                    })();
                };
                recorder.start(100);
                globalThis.setTimeout(() => {
                    if (recorder.state !== "inactive") {
                        recorder.stop();
                    }
                }, args.maxDurationMs);
            });
        },
    };
}
/**
 * Build Spec 139 host-connector adapters for browser audio permission + capture.
 */
export function createBrowserAudioInputAdapters(options) {
    const permissions = options.permissions ?? defaultPermissionDriver();
    const capture = options.capture ?? defaultCaptureDriver();
    const controllers = new Map();
    const requestPermission = async () => {
        const state = await permissions.request();
        if (state === "denied") {
            return failed("policy_denied", "audio permission was denied");
        }
        if (state === "unavailable") {
            return failed("unavailable", "audio permission is unavailable");
        }
        return {
            resultClass: "succeeded",
            payload: { permission_state: state },
        };
    };
    const captureAudio = async (request) => {
        const payload = asRecord(request.payload) ?? {};
        const maxDurationMs = payload.max_duration_ms;
        const maxBytes = payload.max_bytes;
        if (typeof maxDurationMs !== "number" ||
            typeof maxBytes !== "number" ||
            !Number.isFinite(maxDurationMs) ||
            !Number.isFinite(maxBytes) ||
            maxDurationMs <= 0 ||
            maxBytes <= 0) {
            return failed("input_limit_exceeded", "audio.capture requires positive limits");
        }
        const correlationId = typeof payload.correlation_id === "string" && payload.correlation_id.length > 0
            ? payload.correlation_id
            : request.commandId;
        const controller = new AbortController();
        controllers.set(correlationId, controller);
        try {
            const bytes = await capture.capture({
                correlationId,
                maxDurationMs: Math.floor(maxDurationMs),
                maxBytes: Math.floor(maxBytes),
                signal: controller.signal,
            });
            if (bytes.length === 0 || bytes.length > maxBytes) {
                return failed("input_limit_exceeded", "captured audio empty or exceeds max_bytes");
            }
            let artifactRef;
            try {
                artifactRef = options.stageArtifact(bytes, Math.floor(maxBytes));
            }
            catch {
                return failed("input_limit_exceeded", "staging rejected captured audio");
            }
            if (artifactRef.includes("/") ||
                artifactRef.includes(":") ||
                artifactRef.includes("\\")) {
                return failed("unavailable", "host adapter returned a non-opaque artifact reference");
            }
            if (options.persistBytes) {
                await options.persistBytes(artifactRef, bytes);
            }
            return {
                resultClass: "succeeded",
                payload: { artifact_ref: artifactRef },
            };
        }
        catch (error) {
            const code = error && typeof error === "object" && "code" in error
                ? String(error.code)
                : "unavailable";
            if (code === "cancelled") {
                return failed("cancelled", "capture cancelled");
            }
            if (code === "input_limit_exceeded") {
                return failed("input_limit_exceeded", "capture exceeded published ceilings");
            }
            if (code === "policy_denied") {
                return failed("policy_denied", "audio permission was denied");
            }
            return failed("unavailable", "browser audio capture unavailable");
        }
        finally {
            controllers.delete(correlationId);
        }
    };
    return {
        requestPermission,
        captureAudio,
        cancel(correlationId) {
            const controller = controllers.get(correlationId);
            if (controller) {
                controller.abort();
            }
        },
    };
}
/** Query permission without prompting (WIT `permission-status`). */
export async function browserAudioPermissionStatus(driver = defaultPermissionDriver()) {
    return driver.status();
}
