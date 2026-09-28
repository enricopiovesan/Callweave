/**
 * Spec 140 browser host adapter for `traverse.audio-input`.
 *
 * Implements WIT `traverse:audio-input@1.0.0` capture semantics behind the
 * Spec 137 command envelope. Permission/gesture handling stays inside this
 * host module; public results expose only opaque `artifact_ref` /
 * `permission_state` values. Captured bytes are staged through Spec 138/140
 * `stageArtifact` (never paths or URLs).
 */
import type { HostConnectorAdapter } from "./bundleEmbedder.js";
import { AUDIO_PERMISSION_REQUEST_OPERATION } from "./hostConnectorCommand.js";
export { AUDIO_PERMISSION_REQUEST_OPERATION };
export type BrowserAudioPermissionState = "granted" | "denied" | "prompt_required" | "unavailable";
export interface BrowserAudioStageArtifact {
    (bytes: Uint8Array, maxBytes: number): string;
}
/** Injectable capture producer for tests and production MediaRecorder wiring. */
export interface BrowserAudioCaptureDriver {
    capture(args: {
        readonly correlationId: string;
        readonly maxDurationMs: number;
        readonly maxBytes: number;
        readonly signal: AbortSignal;
    }): Promise<Uint8Array>;
}
export interface BrowserAudioPermissionDriver {
    status(): Promise<BrowserAudioPermissionState>;
    request(): Promise<BrowserAudioPermissionState>;
}
export interface BrowserAudioInputAdapters {
    readonly requestPermission: HostConnectorAdapter;
    readonly captureAudio: HostConnectorAdapter;
    cancel(correlationId: string): void;
}
export interface CreateBrowserAudioInputAdaptersOptions {
    readonly stageArtifact: BrowserAudioStageArtifact;
    readonly permissions?: BrowserAudioPermissionDriver;
    readonly capture?: BrowserAudioCaptureDriver;
    /** Optional durable host store (OPFS/IndexedDB); never exposed publicly. */
    readonly persistBytes?: (artifactRef: string, bytes: Uint8Array) => Promise<void> | void;
}
/**
 * Build Spec 139 host-connector adapters for browser audio permission + capture.
 */
export declare function createBrowserAudioInputAdapters(options: CreateBrowserAudioInputAdaptersOptions): BrowserAudioInputAdapters;
/** Query permission without prompting (WIT `permission-status`). */
export declare function browserAudioPermissionStatus(driver?: BrowserAudioPermissionDriver): Promise<BrowserAudioPermissionState>;
