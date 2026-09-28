/**
 * Spec 138 browser surfaces: host-staged I/O + wasm-cpu guest execute.
 * Matches native `traverse_runtime::exact_model` envelopes and guest ABI v1.
 */
export const MODEL_GUEST_ABI_VERSION = 1;
export const MODEL_EXECUTE_EXPORT = "model_execute";
export const PLACEMENT_WASM_CPU = "wasm-cpu";
export class ExactModelError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = "ExactModelError";
        this.code = code;
    }
}
function normalizeDigest(value) {
    const trimmed = value.trim();
    return (trimmed.startsWith("sha256:") ? trimmed.slice("sha256:".length) : trimmed).toLowerCase();
}
async function digestHex(bytes) {
    const copy = new Uint8Array(bytes);
    const hash = await crypto.subtle.digest("SHA-256", copy);
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
/** Encode Spec 138 little-endian guest frame. */
export function encodeGuestFrame(dtype, dims, payload) {
    const rank = dims.length;
    const out = new Uint8Array(4 + rank * 4 + 4 + payload.length);
    const view = new DataView(out.buffer);
    view.setUint16(0, MODEL_GUEST_ABI_VERSION, true);
    out[2] = dtype & 0xff;
    out[3] = rank & 0xff;
    let offset = 4;
    for (const dim of dims) {
        view.setUint32(offset, dim >>> 0, true);
        offset += 4;
    }
    view.setUint32(offset, payload.length >>> 0, true);
    offset += 4;
    out.set(payload, offset);
    return out;
}
export class ModelIoStore {
    inputs = new Map();
    outputs = new Map();
    artifacts = new Map();
    nextInput = 0;
    nextOutput = 0;
    nextArtifact = 0;
    stageModelInput(bytes, maxBytes) {
        if (bytes.length === 0 || bytes.length > maxBytes) {
            throw new ExactModelError("input_limit_exceeded", "staged model input empty or exceeds ceiling");
        }
        this.nextInput += 1;
        const id = `input-${this.nextInput}`;
        this.inputs.set(id, bytes);
        return id;
    }
    takeInput(inputRef) {
        const bytes = this.inputs.get(inputRef);
        if (!bytes) {
            throw new ExactModelError("invalid_input", "input_ref missing or already consumed");
        }
        this.inputs.delete(inputRef);
        return bytes;
    }
    putOutput(bytes) {
        this.nextOutput += 1;
        const id = `output-${this.nextOutput}`;
        this.outputs.set(id, bytes);
        return id;
    }
    readModelOutput(outputRef, maxBytes) {
        const bytes = this.outputs.get(outputRef);
        if (!bytes) {
            throw new ExactModelError("unavailable", "output_ref missing or expired");
        }
        if (bytes.length > maxBytes) {
            throw new ExactModelError("input_limit_exceeded", "output exceeds read ceiling");
        }
        return bytes;
    }
    /**
     * Stage bounded bytes as a multi-read opaque `artifact_ref` (Spec 140 /
     * Spec 138 0.2.0). Readable until `dropRef` or `shutdown`; model
     * `input_ref` keeps its single-consume rule.
     */
    stageArtifact(bytes, maxBytes) {
        if (bytes.length === 0 || bytes.length > maxBytes) {
            throw new ExactModelError("input_limit_exceeded", "staged artifact empty or exceeds ceiling");
        }
        this.nextArtifact += 1;
        const id = `artifact-${this.nextArtifact}`;
        this.artifacts.set(id, new Uint8Array(bytes));
        return id;
    }
    /** Runtime-mediated bounded read of an `artifact_ref`. Repeatable. */
    readArtifact(artifactRef, maxBytes) {
        const bytes = this.artifacts.get(artifactRef);
        if (!bytes) {
            throw new ExactModelError("unavailable", "artifact_ref missing or expired");
        }
        if (bytes.length > maxBytes) {
            throw new ExactModelError("input_limit_exceeded", "artifact exceeds read ceiling");
        }
        return new Uint8Array(bytes);
    }
    /** Drop an input, output, or artifact ref. */
    dropRef(reference) {
        this.inputs.delete(reference);
        this.outputs.delete(reference);
        this.artifacts.delete(reference);
    }
    /** Invalidate every staged ref (runtime shutdown). */
    shutdown() {
        this.inputs.clear();
        this.outputs.clear();
        this.artifacts.clear();
    }
}
export class ExactModelBrowserHost {
    pins;
    io = new ModelIoStore();
    packages = new Map();
    constructor(pins) {
        this.pins = pins;
    }
    async insertVerified(manifest, wasm) {
        if (!manifest.license_id || !manifest.wasm_digest || manifest.abi_version < 1) {
            throw new ExactModelError("model_incompatible", "model manifest incomplete");
        }
        if (!manifest.supported_profiles.includes(PLACEMENT_WASM_CPU)) {
            throw new ExactModelError("model_incompatible", "model manifest does not support wasm-cpu");
        }
        const actual = await digestHex(wasm);
        if (normalizeDigest(manifest.wasm_digest) !== actual) {
            throw new ExactModelError("model_incompatible", "model wasm digest mismatch");
        }
        const key = normalizeDigest(manifest.package_digest);
        this.packages.set(key, { manifest, wasm });
        return key;
    }
    async execute(args) {
        if (!args.policy_ref) {
            throw new ExactModelError("policy_denied", "policy_ref is not activated");
        }
        if (!args.allowed_classifications.includes(args.data_classification)) {
            throw new ExactModelError("policy_denied", "data_classification denied by policy");
        }
        const pin = this.pins.find((candidate) => candidate.model_id === args.model_ref.model_id &&
            candidate.version === args.model_ref.version &&
            normalizeDigest(candidate.digest) === normalizeDigest(args.model_ref.digest));
        if (!pin) {
            throw new ExactModelError("model_unavailable", "model_ref does not match an exact_model_dependencies pin");
        }
        const pack = this.packages.get(normalizeDigest(args.model_ref.digest));
        if (!pack) {
            throw new ExactModelError("model_unavailable", "model package not present in verified cache");
        }
        if (pack.manifest.model_id !== args.model_ref.model_id ||
            pack.manifest.version !== args.model_ref.version ||
            pack.manifest.input_schema_ref !== args.input_schema_ref ||
            pack.manifest.input_schema_version !== args.input_schema_version) {
            throw new ExactModelError("model_incompatible", "cached package identity or schema mismatch");
        }
        const input = this.io.takeInput(args.input_ref);
        if (input.length > pack.manifest.max_input_bytes) {
            throw new ExactModelError("resource_exhausted", "input exceeds model manifest ceiling");
        }
        const ceiling = Math.min(args.max_output_bytes, pack.manifest.max_output_bytes);
        const output = await runWasmCpu(pack.wasm, input, ceiling);
        if (output.length > ceiling) {
            throw new ExactModelError("resource_exhausted", "model output exceeds ceiling");
        }
        return { output_ref: this.io.putOutput(output), placement: PLACEMENT_WASM_CPU };
    }
}
async function runWasmCpu(wasm, input, maxOutputBytes) {
    const module = await WebAssembly.compile(new Uint8Array(wasm));
    // Deny-by-default: no imports.
    const instance = await WebAssembly.instantiate(module, {});
    const memory = instance.exports.memory;
    const execute = instance.exports[MODEL_EXECUTE_EXPORT];
    if (!(memory instanceof WebAssembly.Memory) || typeof execute !== "function") {
        throw new ExactModelError("model_incompatible", "model wasm missing memory or model_execute");
    }
    const inPtr = 64;
    const outPtr = inPtr + input.length + 64;
    const needed = outPtr + maxOutputBytes;
    const pageSize = 65536;
    while (memory.buffer.byteLength < needed) {
        memory.grow(1);
        if (memory.buffer.byteLength > pageSize * 256) {
            throw new ExactModelError("resource_exhausted", "model memory grow failed");
        }
    }
    new Uint8Array(memory.buffer, inPtr, input.length).set(input);
    const outLen = Number(execute(inPtr, input.length, outPtr, maxOutputBytes));
    if (!Number.isFinite(outLen) || outLen < 0 || outLen > maxOutputBytes) {
        throw new ExactModelError("resource_exhausted", "model returned invalid output length");
    }
    return new Uint8Array(memory.buffer.slice(outPtr, outPtr + outLen));
}
