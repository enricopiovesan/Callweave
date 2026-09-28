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
export class RuntimeWasmHostError extends Error {
    constructor(message) {
        super(`runtime.wasm host error: ${message}`);
        this.name = "RuntimeWasmHostError";
    }
}
function err(message) {
    return new RuntimeWasmHostError(message);
}
function encodeUtf8(text) {
    return new TextEncoder().encode(text);
}
function decodeUtf8(bytes) {
    return new TextDecoder().decode(bytes);
}
/**
 * Drives one `runtime-wasm-bridge/1.0.0` instance (spec `071` FR-006).
 * One instance corresponds to one guest module instantiation — `init` MUST
 * be called before `submit`.
 */
export class RuntimeWasmHost {
    memory;
    alloc;
    deallocFn;
    initFn;
    submitFn;
    nextEventFn;
    shutdownFn;
    constructor(memory, alloc, deallocFn, initFn, submitFn, nextEventFn, shutdownFn) {
        this.memory = memory;
        this.alloc = alloc;
        this.deallocFn = deallocFn;
        this.initFn = initFn;
        this.submitFn = submitFn;
        this.nextEventFn = nextEventFn;
        this.shutdownFn = shutdownFn;
    }
    /** Instantiates `runtimeWasmBytes` and resolves the required ABI exports. */
    static async instantiate(runtimeWasmBytes) {
        let module;
        try {
            const copy = new Uint8Array(runtimeWasmBytes.byteLength);
            copy.set(runtimeWasmBytes);
            module = await WebAssembly.compile(copy.buffer);
        }
        catch (cause) {
            throw err(`module: ${String(cause)}`);
        }
        return RuntimeWasmHost.fromModule(module);
    }
    /**
     * Synchronously instantiates a previously compiled `runtime.wasm` module.
     * Used by `BundleEmbedder.submit` so the public embedder API stays sync
     * after `init` has already `WebAssembly.compile`d the orchestrator.
     */
    static fromModule(module) {
        let instance;
        try {
            // runtime.wasm is import-free at the outer boundary (nested wasmi
            // links WASI + traverse_host for capability guests internally).
            instance = new WebAssembly.Instance(module, {});
        }
        catch (cause) {
            throw err(`instantiate: ${String(cause)}`);
        }
        const exports = instance.exports;
        const memory = exports["memory"];
        if (!(memory instanceof WebAssembly.Memory)) {
            throw err("missing export: memory");
        }
        const alloc = exports["traverse_alloc"];
        const deallocFn = exports["traverse_dealloc"];
        const initFn = exports["traverse_init"];
        const submitFn = exports["traverse_submit"];
        const nextEventFn = exports["traverse_next_event"];
        const shutdownFn = exports["traverse_shutdown"];
        if (typeof alloc !== "function")
            throw err("missing export: traverse_alloc");
        if (typeof deallocFn !== "function")
            throw err("missing export: traverse_dealloc");
        if (typeof initFn !== "function")
            throw err("missing export: traverse_init");
        if (typeof submitFn !== "function")
            throw err("missing export: traverse_submit");
        if (typeof nextEventFn !== "function")
            throw err("missing export: traverse_next_event");
        if (typeof shutdownFn !== "function")
            throw err("missing export: traverse_shutdown");
        return new RuntimeWasmHost(memory, alloc, deallocFn, initFn, submitFn, nextEventFn, shutdownFn);
    }
    writeBytes(bytes) {
        if (bytes.byteLength > 0x7fff_ffff) {
            throw err("payload too large for the wasm32 ABI (max i32::MAX bytes)");
        }
        const len = bytes.byteLength;
        const ptr = this.alloc(len);
        if (ptr <= 0 && len > 0) {
            throw err("traverse_alloc returned a non-positive pointer");
        }
        new Uint8Array(this.memory.buffer, ptr, len).set(bytes);
        return { ptr, len };
    }
    dealloc(ptr, len) {
        try {
            this.deallocFn(ptr, len);
        }
        catch {
            // Best-effort: a failed free leaks guest memory for this instance.
        }
    }
    readDescriptor(descriptorPtr) {
        const header = new Uint8Array(this.memory.buffer, descriptorPtr, 8);
        const responsePtr = new DataView(header.buffer, header.byteOffset, 8).getInt32(0, true);
        const responseLen = new DataView(header.buffer, header.byteOffset, 8).getInt32(4, true);
        let response = new Uint8Array(0);
        if (responseLen > 0 && responsePtr >= 0) {
            response = new Uint8Array(this.memory.buffer, responsePtr, responseLen).slice();
        }
        this.dealloc(descriptorPtr, 8);
        if (responsePtr > 0) {
            this.dealloc(responsePtr, responseLen);
        }
        return response;
    }
    callJson(target, payload) {
        const outDescriptor = this.alloc(8);
        const written = this.writeBytes(payload);
        let status;
        try {
            status = target(written.ptr, written.len, outDescriptor);
        }
        finally {
            this.dealloc(written.ptr, written.len);
        }
        const response = this.readDescriptor(outDescriptor);
        return { status, response };
    }
    parseResponse(bytes) {
        if (bytes.byteLength === 0) {
            return null;
        }
        try {
            return JSON.parse(decodeUtf8(bytes));
        }
        catch (cause) {
            throw err(`response JSON: ${String(cause)}`);
        }
    }
    /**
     * Calls `traverse_init` with capability metadata + nested WASM bytes
     * (`[u32 LE header_len][JSON header][artifact]`).
     */
    init(capability, capabilityWasm) {
        const headerObject = {
            capability_id: capability.capabilityId,
            capability_version: capability.capabilityVersion,
            service_type: capability.serviceType,
            emits: capability.emits.map((entry) => ({
                event_id: entry.event_id,
                version: entry.version,
            })),
            host_placement_target: capability.hostPlacementTarget,
            permitted_targets: [...capability.permittedTargets],
        };
        if (capability.stateMachine !== undefined) {
            headerObject.state_machine = capability.stateMachine;
            headerObject.app_id = capability.capabilityId;
        }
        const headerBytes = encodeUtf8(JSON.stringify(headerObject));
        const headerLen = headerBytes.byteLength;
        if (headerLen > 0xffff_ffff) {
            throw err("init header too large for the wasm32 ABI");
        }
        const payload = new Uint8Array(4 + headerLen + capabilityWasm.byteLength);
        new DataView(payload.buffer).setUint32(0, headerLen, true);
        payload.set(headerBytes, 4);
        payload.set(capabilityWasm, 4 + headerLen);
        const { status, response } = this.callJson(this.initFn, payload);
        const parsed = this.parseResponse(response);
        if (status !== 0) {
            throw err(`traverse_init rejected: ${JSON.stringify(parsed)}`);
        }
        return parsed;
    }
    /** Calls `traverse_submit` with raw capability-stdin bytes. */
    submit(request) {
        const { status, response } = this.callJson(this.submitFn, request);
        const parsed = this.parseResponse(response);
        if (status !== 0) {
            throw err(`traverse_submit rejected: ${JSON.stringify(parsed)}`);
        }
        return parsed;
    }
    /** Drains every queued `traverse_next_event` envelope until the guest returns 0. */
    drainEvents() {
        const events = [];
        for (;;) {
            const outDescriptor = this.alloc(8);
            const hasEvent = this.nextEventFn(outDescriptor);
            if (hasEvent === 0) {
                this.dealloc(outDescriptor, 8);
                break;
            }
            const bytes = this.readDescriptor(outDescriptor);
            events.push(this.parseResponse(bytes));
        }
        return events;
    }
    shutdown() {
        const outDescriptor = this.alloc(8);
        this.shutdownFn(outDescriptor);
        return this.parseResponse(this.readDescriptor(outDescriptor));
    }
}
/**
 * Maps drained `runtime.wasm` envelopes onto the embedder's event stream
 * shape (`capability_invoked` / `capability_result` / `capability_event`).
 * Lifecycle envelopes keep their type; domain events become
 * `capability_event` with `event_type` + payload (Decision 89 host publish).
 */
export function mapRuntimeWasmEvents(events) {
    const mapped = [];
    for (const event of events) {
        if (event === null || typeof event !== "object" || Array.isArray(event)) {
            continue;
        }
        const record = event;
        const type = typeof record["type"] === "string" ? record["type"] : null;
        if (type === null) {
            continue;
        }
        const data = (record["data"] ?? {});
        if (type === "capability_invoked" || type === "capability_result") {
            mapped.push({ type, data });
            continue;
        }
        // Domain event from nested emit_event — host publishes as capability_event.
        const dataRecord = data !== null && typeof data === "object" && !Array.isArray(data)
            ? data
            : {};
        mapped.push({
            type: "capability_event",
            data: {
                event_type: type,
                version: dataRecord["version"] ?? null,
                payload: dataRecord["payload"] ?? data,
            },
        });
    }
    return mapped;
}
/**
 * Parse contract/manifest `emits` entries into `{ event_id, version }` pairs
 * for `RuntimeWasmHost.init`. Unknown shapes are skipped.
 */
export function parseDeclaredEmits(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    const declared = [];
    for (const entry of value) {
        if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
            continue;
        }
        const record = entry;
        const eventId = record["event_id"];
        const version = record["version"];
        if (typeof eventId === "string" && typeof version === "string") {
            declared.push({ event_id: eventId, version });
        }
    }
    return declared;
}
/** Maps optional manifest `service_type` onto the runtime.wasm wire enum. */
export function mapServiceType(serviceType) {
    if (serviceType === "subscribable" || serviceType === "stateful") {
        return serviceType;
    }
    return "stateless";
}
