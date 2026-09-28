/**
 * Offline execution handoff for reviewed browser workflow proposals (Spec
 * 1277 FR-005..FR-007).  This module deliberately accepts no loader or
 * fetcher: every component must already be in the host-owned verified cache.
 * Capability execution goes through the shared `runtime.wasm` orchestrator
 * (spec `1402` FR-008); callers supply verified `runtimeWasmBytes`.
 */
import { resolveRegistryDependencyOffline } from "./registryCache.js";
import { RuntimeWasmHost, mapRuntimeWasmEvents, mapServiceType, parseDeclaredEmits, } from "./runtimeWasmHost.js";
export const COMPOSED_WORKFLOW_MAX_NODES = 8;
export const COMPOSED_WORKFLOW_MAX_PAYLOAD_BYTES = 64 * 1024;
/** Stable, secret-free pre-execution refusal. */
export class ComposedWorkflowError extends Error {
    code;
    node_id;
    constructor(code, message, node_id = null) {
        super(message);
        this.code = code;
        this.node_id = node_id;
        this.name = "ComposedWorkflowError";
    }
}
const encoder = new TextEncoder();
const asRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
const bytes = (value) => encoder.encode(JSON.stringify(value)).byteLength;
async function digest(value) {
    const stable = (item) => Array.isArray(item) ? `[${item.map(stable).join(",")}]` : item !== null && typeof item === "object" ? `{${Object.keys(item).sort().map(k => `${JSON.stringify(k)}:${stable(item[k])}`).join(",")}}` : JSON.stringify(item);
    const hash = await crypto.subtle.digest("SHA-256", encoder.encode(stable(value)));
    return `sha256:${[...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("")}`;
}
function executionInput(state, proposal, nodeId) {
    const input = {};
    for (const mapping of proposal.proposal.mappings) {
        if (mapping.to_node_id !== nodeId)
            continue;
        const source = mapping.source === "starting_facts" ? asRecord(proposal.proposal.initial_input) : state[mapping.from_node_id ?? ""];
        const sourceRecord = asRecord(source);
        if (sourceRecord !== null && sourceRecord[mapping.from_field] !== undefined)
            input[mapping.to_field] = sourceRecord[mapping.from_field];
    }
    return input;
}
function classifyFailure(message) {
    const lower = message.toLowerCase();
    if (lower.includes("not valid json") || lower.includes("deserialization")) {
        return "output_deserialization_failed";
    }
    if (lower.includes("unauthorized") ||
        lower.includes("unknown import") ||
        lower.includes("import ") ||
        lower.includes("link ")) {
        return "constraint_violated";
    }
    return "execution_failed";
}
async function runThroughRuntime(runtimeWasmBytes, capabilityWasm, input, meta, onAccepted) {
    let host;
    try {
        host = await RuntimeWasmHost.instantiate(runtimeWasmBytes);
    }
    catch {
        return { output: null, failure: "constraint_violated" };
    }
    try {
        host.init({
            capabilityId: meta.capabilityId,
            capabilityVersion: meta.capabilityVersion,
            serviceType: mapServiceType(meta.serviceType),
            emits: meta.emits,
            hostPlacementTarget: "browser",
            permittedTargets: ["browser"],
        }, capabilityWasm);
    }
    catch (error) {
        return { output: null, failure: classifyFailure(String(error)) };
    }
    try {
        host.submit(encoder.encode(JSON.stringify(input)));
    }
    catch (error) {
        return { output: null, failure: classifyFailure(String(error)) };
    }
    let drained;
    try {
        drained = host.drainEvents();
    }
    catch (error) {
        return { output: null, failure: classifyFailure(String(error)) };
    }
    try {
        host.shutdown();
    }
    catch {
        // Best-effort.
    }
    const mapped = mapRuntimeWasmEvents(drained);
    let output = null;
    let failure = null;
    for (const event of mapped) {
        if (event.type === "capability_event") {
            const data = event.data !== null && typeof event.data === "object" && !Array.isArray(event.data)
                ? event.data
                : {};
            const eventId = typeof data["event_type"] === "string" ? data["event_type"] : null;
            const version = typeof data["version"] === "string" ? data["version"] : "0.0.0";
            if (eventId !== null) {
                onAccepted({
                    event_id: eventId,
                    version,
                    payload: (data["payload"] ?? {}),
                });
            }
            continue;
        }
        if (event.type !== "capability_result") {
            continue;
        }
        const data = event.data !== null && typeof event.data === "object" && !Array.isArray(event.data)
            ? event.data
            : {};
        if (data["status"] === "completed") {
            output = (data["output"] ?? null);
            failure = null;
        }
        else {
            const errorText = typeof data["error"] === "string" ? data["error"] : "capability failed";
            failure = classifyFailure(errorText);
            output = null;
        }
    }
    if (failure === null && output === null) {
        // Empty stdout can legitimately yield null/empty; treat missing result as failure.
        const hasResult = mapped.some((event) => event.type === "capability_result");
        if (!hasResult) {
            return { output: null, failure: "execution_failed" };
        }
    }
    return { output, failure };
}
/** Executes a reviewed proposal entirely offline against exact cache entries. */
export async function executeBrowserComposedWorkflow(proposal, store, snapshot, options) {
    if (proposal.mapping_unconfirmed ||
        proposal.kind !== "browser_workflow_proposal" ||
        proposal.proposal.kind !== "workflow_proposal" ||
        proposal.proposal.nodes.length === 0 ||
        proposal.proposal.nodes.length > COMPOSED_WORKFLOW_MAX_NODES ||
        bytes(proposal.proposal.initial_input) > COMPOSED_WORKFLOW_MAX_PAYLOAD_BYTES) {
        throw new ComposedWorkflowError("composed_workflow_proposal_invalid", "reviewed proposal exceeds the supported structural bounds");
    }
    if (options.runtimeWasmBytes.byteLength === 0) {
        throw new ComposedWorkflowError("composed_workflow_proposal_invalid", "runtime.wasm bytes are required for composed execution");
    }
    if (proposal.source_release !== snapshot.releaseTag || proposal.snapshot_digest !== await digest(snapshot)) {
        throw new ComposedWorkflowError("composed_workflow_snapshot_mismatch", "reviewed proposal is not bound to the supplied snapshot");
    }
    const nodes = proposal.proposal.nodes;
    if (new Set(nodes.map(node => node.node_id)).size !== nodes.length) {
        throw new ComposedWorkflowError("composed_workflow_proposal_invalid", "proposal node identifiers must be unique");
    }
    const state = {};
    const outcomes = [];
    for (const node of nodes) {
        const record = snapshot.capabilities.find(item => item.id === node.capability_id && item.version === node.capability_version && !item.deprecated);
        if (!record) {
            throw new ComposedWorkflowError("composed_workflow_missing_capability", "no active exact registry component exists for node", node.node_id);
        }
        let dependency;
        try {
            dependency = await resolveRegistryDependencyOffline(store, {
                namespace: record.namespace,
                id: record.id,
                versionRange: record.version,
            });
        }
        catch {
            throw new ComposedWorkflowError("composed_workflow_missing_capability", "prepared verified dependency is missing", node.node_id);
        }
        if (dependency.evidence.indexDigest !== proposal.snapshot_digest) {
            throw new ComposedWorkflowError("composed_workflow_dependency_evidence_mismatch", "prepared dependency belongs to a different snapshot", node.node_id);
        }
        if (node.artifact_digest !== dependency.wasmDigest || node.artifact_digest !== dependency.evidence.artifactDigest) {
            throw new ComposedWorkflowError("composed_workflow_artifact_digest_drift", "prepared artifact digest differs from reviewed node", node.node_id);
        }
        let contract;
        try {
            contract = asRecord(JSON.parse(new TextDecoder().decode(dependency.contractBytes)));
        }
        catch {
            contract = null;
        }
        if (!contract || contract.id !== node.capability_id || contract.version !== node.capability_version) {
            throw new ComposedWorkflowError("composed_workflow_dependency_contract_invalid", "prepared contract does not match reviewed capability", node.node_id);
        }
        const risk = asRecord(contract.risk);
        if (risk?.effect_class !== "pure_read" || risk?.determinism_class !== "deterministic") {
            throw new ComposedWorkflowError("composed_workflow_approval_required", "capability requires runtime authorization", node.node_id);
        }
        const serviceType = typeof contract.service_type === "string" ? contract.service_type : null;
        const emits = parseDeclaredEmits(contract.emits);
        const result = await runThroughRuntime(options.runtimeWasmBytes, dependency.wasmBytes, executionInput(state, proposal, node.node_id), {
            capabilityId: node.capability_id,
            capabilityVersion: node.capability_version,
            serviceType,
            emits,
        }, (event) => {
            options.onCapabilityEvent?.({
                ...event,
                node_id: node.node_id,
                capability_id: node.capability_id,
                capability_version: node.capability_version,
            });
        });
        outcomes.push({
            node_id: node.node_id,
            capability_id: node.capability_id,
            capability_version: node.capability_version,
            status: result.failure === null ? "succeeded" : "failed",
            failure_class: result.failure,
        });
        if (result.failure !== null) {
            for (const later of nodes.slice(outcomes.length)) {
                outcomes.push({
                    node_id: later.node_id,
                    capability_id: later.capability_id,
                    capability_version: later.capability_version,
                    status: "not_started",
                    failure_class: null,
                });
            }
            return { terminal_state: "failed", snapshot_digest: proposal.snapshot_digest, node_outcomes: outcomes };
        }
        state[node.node_id] = result.output;
    }
    return { terminal_state: "succeeded", snapshot_digest: proposal.snapshot_digest, node_outcomes: outcomes };
}
