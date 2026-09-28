/**
 * Spec 138 browser surfaces: host-staged I/O + wasm-cpu guest execute.
 * Matches native `traverse_runtime::exact_model` envelopes and guest ABI v1.
 */
export declare const MODEL_GUEST_ABI_VERSION: 1;
export declare const MODEL_EXECUTE_EXPORT: "model_execute";
export declare const PLACEMENT_WASM_CPU: "wasm-cpu";
export type ExactModelPin = {
    readonly model_id: string;
    readonly version: string;
    readonly digest: string;
    readonly offline_allowed: boolean;
};
export type ModelPackageManifest = {
    readonly model_id: string;
    readonly version: string;
    readonly wasm_digest: string;
    readonly package_digest: string;
    readonly input_schema_ref: string;
    readonly input_schema_version: string;
    readonly max_memory_bytes: number;
    readonly max_fuel: number;
    readonly max_input_bytes: number;
    readonly max_output_bytes: number;
    readonly offline_allowed: boolean;
    readonly supported_profiles: readonly string[];
    readonly license_id: string;
    readonly abi_version: number;
};
export declare class ExactModelError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
/** Encode Spec 138 little-endian guest frame. */
export declare function encodeGuestFrame(dtype: number, dims: readonly number[], payload: Uint8Array): Uint8Array;
export declare class ModelIoStore {
    private inputs;
    private outputs;
    private artifacts;
    private nextInput;
    private nextOutput;
    private nextArtifact;
    stageModelInput(bytes: Uint8Array, maxBytes: number): string;
    takeInput(inputRef: string): Uint8Array;
    putOutput(bytes: Uint8Array): string;
    readModelOutput(outputRef: string, maxBytes: number): Uint8Array;
    /**
     * Stage bounded bytes as a multi-read opaque `artifact_ref` (Spec 140 /
     * Spec 138 0.2.0). Readable until `dropRef` or `shutdown`; model
     * `input_ref` keeps its single-consume rule.
     */
    stageArtifact(bytes: Uint8Array, maxBytes: number): string;
    /** Runtime-mediated bounded read of an `artifact_ref`. Repeatable. */
    readArtifact(artifactRef: string, maxBytes: number): Uint8Array;
    /** Drop an input, output, or artifact ref. */
    dropRef(reference: string): void;
    /** Invalidate every staged ref (runtime shutdown). */
    shutdown(): void;
}
export declare class ExactModelBrowserHost {
    private readonly pins;
    readonly io: ModelIoStore;
    private packages;
    constructor(pins: readonly ExactModelPin[]);
    insertVerified(manifest: ModelPackageManifest, wasm: Uint8Array): Promise<string>;
    execute(args: {
        readonly model_ref: {
            model_id: string;
            version: string;
            digest: string;
        };
        readonly input_ref: string;
        readonly policy_ref: string;
        readonly data_classification: string;
        readonly input_schema_ref: string;
        readonly input_schema_version: string;
        readonly max_output_bytes: number;
        readonly allowed_classifications: readonly string[];
    }): Promise<{
        output_ref: string;
        placement: typeof PLACEMENT_WASM_CPU;
    }>;
}
