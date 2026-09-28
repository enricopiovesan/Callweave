/**
 * Browser driver for `runtime.wasm` (spec `1402` FR-006, Decision 86/88/89).
 *
 * Ports `crates/traverse-runtime/src/runtime_wasm_host.rs`'s
 * `RuntimeWasmHost` call conventions onto the WebAssembly JS API so the
 * browser package loads the same nested-wasmi orchestrator native hosts use,
 * rather than reimplementing capability WASI + `emit_event` in TypeScript.
 *
 * Durability / EventBroker publish stays host-owned (Decision 89): this
 * module only drains lifecycle + domain envelopes from `traverse_next_event`.
 * Callers map those onto `TraverseEmbedderApi` event callbacks.
 */
export type RuntimeWasmJson = null | boolean | number | string | RuntimeWasmJson[] | {
    readonly [key: string]: RuntimeWasmJson;
};
export interface RuntimeWasmEmitRef {
    readonly event_id: string;
    readonly version: string;
}
export interface RuntimeWasmCapabilityInit {
    readonly capabilityId: string;
    readonly capabilityVersion: string;
    readonly serviceType: "stateless" | "subscribable" | "stateful";
    readonly emits: readonly RuntimeWasmEmitRef[];
    /** Placement of this browser host — almost always `"browser"`. */
    readonly hostPlacementTarget: "browser" | "local" | "edge" | "cloud" | "worker" | "device";
    readonly permittedTargets: readonly ("browser" | "local" | "edge" | "cloud" | "worker" | "device")[];
    /**
     * Spec 139 app `state_machine` document. When present, `traverse_submit`
     * accepts `kind: "app_command"` envelopes against this machine.
     */
    readonly stateMachine?: RuntimeWasmJson;
}
export declare class RuntimeWasmHostError extends Error {
    constructor(message: string);
}
/**
 * Drives one `runtime-wasm-bridge/1.0.0` instance (spec `071` FR-006).
 * One instance corresponds to one guest module instantiation — `init` MUST
 * be called before `submit`.
 */
export declare class RuntimeWasmHost {
    private readonly memory;
    private readonly alloc;
    private readonly deallocFn;
    private readonly initFn;
    private readonly submitFn;
    private readonly nextEventFn;
    private readonly shutdownFn;
    private constructor();
    /** Instantiates `runtimeWasmBytes` and resolves the required ABI exports. */
    static instantiate(runtimeWasmBytes: Uint8Array): Promise<RuntimeWasmHost>;
    /**
     * Synchronously instantiates a previously compiled `runtime.wasm` module.
     * Used by `BundleEmbedder.submit` so the public embedder API stays sync
     * after `init` has already `WebAssembly.compile`d the orchestrator.
     */
    static fromModule(module: WebAssembly.Module): RuntimeWasmHost;
    private writeBytes;
    private dealloc;
    private readDescriptor;
    private callJson;
    private parseResponse;
    /**
     * Calls `traverse_init` with capability metadata + nested WASM bytes
     * (`[u32 LE header_len][JSON header][artifact]`).
     */
    init(capability: RuntimeWasmCapabilityInit, capabilityWasm: Uint8Array): RuntimeWasmJson;
    /** Calls `traverse_submit` with raw capability-stdin bytes. */
    submit(request: Uint8Array): RuntimeWasmJson;
    /** Drains every queued `traverse_next_event` envelope until the guest returns 0. */
    drainEvents(): RuntimeWasmJson[];
    shutdown(): RuntimeWasmJson;
}
/**
 * Maps drained `runtime.wasm` envelopes onto the embedder's event stream
 * shape (`capability_invoked` / `capability_result` / `capability_event`).
 * Lifecycle envelopes keep their type; domain events become
 * `capability_event` with `event_type` + payload (Decision 89 host publish).
 */
export declare function mapRuntimeWasmEvents(events: readonly RuntimeWasmJson[]): Array<{
    type: string;
    data: RuntimeWasmJson;
}>;
/**
 * Parse contract/manifest `emits` entries into `{ event_id, version }` pairs
 * for `RuntimeWasmHost.init`. Unknown shapes are skipped.
 */
export declare function parseDeclaredEmits(value: unknown): RuntimeWasmEmitRef[];
/** Maps optional manifest `service_type` onto the runtime.wasm wire enum. */
export declare function mapServiceType(serviceType: string | null | undefined): "stateless" | "subscribable" | "stateful";
