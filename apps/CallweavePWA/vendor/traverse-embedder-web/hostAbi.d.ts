/**
 * Traverse Host ABI import catalog (mirrors
 * `crates/traverse-runtime/src/executor/host_abi_v1.json`).
 *
 * Per-capability load-time whitelist enforcement lived in the interim
 * browser executor and was retired with spec `1402` FR-007: nested
 * `runtime.wasm` (wasmi) is now the sole linker for capability guests.
 * This module keeps the catalog as documentation / shared reference.
 */
export interface HostAbiImport {
    readonly module: string;
    readonly name: string;
}
/** Traverse Host ABI version nested `runtime.wasm` links against. */
export declare const SUPPORTED_HOST_ABI_VERSION = "1.0.0";
export declare const HOST_ABI_V1_WHITELIST: readonly HostAbiImport[];
