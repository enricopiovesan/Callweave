import type { BundleLoader } from "./bundleLoader.js";
import { IndexedDbDataStore } from "./indexedDbDataStore.js";
import type { CompatibleLifecycleOutcome, CompatibleStartOutcome, EmbeddedTraceApi, EmbeddedTraceApiError, EmbeddedTraceDetail, EmbeddedTracePage, EventCallback, JsonValue, ShutdownOutcome, AppCommandEnvelope, SubmitOutcome, TraverseEmbedderApi } from "./types.js";
/** Configuration for `BundleEmbedder.init` (`runtime.init` input). */
export interface BundleEmbedderConfig {
    /** Path or URL to the application bundle's `app.manifest.json`. */
    readonly manifestPath: string;
    /** Loader used to fetch bundle files (browser: `FetchBundleLoader`). */
    readonly loader: BundleLoader;
    /** Workspace identity recorded on events. Defaults to `local-default`. */
    readonly workspaceId?: string;
    /** Platform identity checked against compatible-capability allowlists. */
    readonly platform?: string;
    /**
     * Bundle-relative path to `runtime.wasm` (default `runtime/runtime.wasm`).
     * Digest is read from the companion `<path>.sha256` sidecar.
     */
    readonly runtimeWasmPath?: string;
}
/** A host-owned response for one Spec 139 connector wait. */
export interface HostConnectorAdapterResult {
    readonly resultClass: "succeeded" | "failed" | "cancelled" | "timeout";
    readonly payload?: JsonValue;
}
/**
 * Browser host authority. It runs outside `runtime.wasm`; the orchestrator
 * receives only the correlated, typed terminal envelope.
 */
export type HostConnectorAdapter = (request: {
    readonly command: string;
    readonly commandId: string;
    readonly sessionId: string;
    readonly payload: JsonValue;
}) => Promise<HostConnectorAdapterResult>;
export declare class BundleEmbedder implements TraverseEmbedderApi, EmbeddedTraceApi {
    private readonly core;
    private readonly runtimeModule;
    private readonly runtimeDigest;
    private readonly wasmTargets;
    private readonly workflowTargets;
    private readonly wasmComponentEvidence;
    private readonly stateMachine;
    private indexedDbDataStore;
    /** Long-lived Spec 139 app orchestrator instance (process-local sessions). */
    private appHost;
    /** Host-owned monotonic deadline handles for outstanding Spec 139 waits. */
    private readonly appDeadlineTimers;
    private readonly hostConnectorAdapters;
    private constructor();
    /**
     * Binds a Spec `085` IndexedDB DataStore for Stateful Browser activation
     * (Spec `132`). Pass `null` to clear. Attestation inspects this handle —
     * an honor-system flag is not accepted.
     */
    bindIndexedDbDataStore(store: IndexedDbDataStore | null): void;
    /**
     * `runtime.init`: load and digest-verify the application bundle plus
     * `runtime.wasm`. Rejects deterministically with a `BundleRejectedError`
     * and never falls back to a sidecar (spec 068 NFR-001). Host-ABI import
     * validation for nested capabilities is owned by `runtime.wasm` (FR-007).
     */
    static init(config: BundleEmbedderConfig): Promise<BundleEmbedder>;
    submit(targetId: string, input: JsonValue): SubmitOutcome;
    submit(envelope: AppCommandEnvelope): SubmitOutcome;
    private submitAppCommand;
    /**
     * Registers a target-neutral host authority by its manifest command name.
     * The returned disposer prevents an old page integration retaining authority
     * after it has been replaced.
     */
    registerHostConnectorAdapter(command: string, adapter: HostConnectorAdapter): () => void;
    private dispatchPendingHostConnector;
    private completeHostConnector;
    /**
     * Registers the host-side half of Spec 139's dual deadline. The timer is
     * deliberately outside runtime.wasm: browser clocks are host authority;
     * runtime.wasm only receives the correlated terminal envelope.
     */
    private registerAppDeadlines;
    private emitAppEvents;
    private ensureAppHost;
    private submitCapability;
    private submitWorkflow;
    subscribe(callback: EventCallback): void;
    embeddedTraceApiVersion(): string;
    traceList(requestedVersion: string, pageSize: number, cursor?: string | null): EmbeddedTracePage | EmbeddedTraceApiError;
    traceGet(requestedVersion: string, traceId: string): EmbeddedTraceDetail | EmbeddedTraceApiError;
    startCompatible(capabilityId: string, input: JsonValue): CompatibleStartOutcome;
    stopCompatible(capabilityId: string, instanceId?: string | null): CompatibleLifecycleOutcome;
    killCompatible(capabilityId: string, instanceId?: string | null): CompatibleLifecycleOutcome;
    shutdown(): ShutdownOutcome;
    releaseEvidence(): JsonValue;
}
