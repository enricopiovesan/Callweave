export const BROWSER_WORKFLOW_PROPOSAL_SCHEMA_VERSION = "1.0.0";
export const SUPPORTED_BROWSER_PLAN_CONTRACT_SCHEMA_VERSION = "1.0.0";
export const BROWSER_PLAN_MAX_CANDIDATES = 5;
export const BROWSER_PLAN_MAX_NODES = 8;
export const BROWSER_PLAN_MAX_FACT_BYTES = 64 * 1024;
export const BROWSER_PLAN_MAX_DEPENDENCIES = 128;
export class BrowserPlanError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "BrowserPlanError";
    }
}
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
const strings = (value) => Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
function required(value) { const r = record(value); return strings(r?.required); }
/**
 * Declared JSON type of every schema property that has one, mirroring Rust
 * `schema_property_type`. A property with no string `type` keyword is absent
 * from the map, so it can never satisfy coverage — it is never removed from
 * the `required` name list instead (issue #1476).
 */
function propertyTypes(value) {
    const properties = record(record(value)?.properties) ?? {};
    const types = new Map();
    for (const name of Object.keys(properties).sort()) {
        const type = record(properties[name])?.type;
        if (typeof type === "string")
            types.set(name, type);
    }
    return types;
}
/** Starting-fact JSON type. JS erases integer/float lexical distinctions:
 * `1.0` is an integer-valued Number here, unlike a serde f64 parsed from 1.0. */
function jsonTypeName(value) {
    if (value === null)
        return "null";
    if (Array.isArray(value))
        return "array";
    if (typeof value === "boolean")
        return "boolean";
    if (typeof value === "number")
        return Number.isInteger(value) ? "integer" : "number";
    if (typeof value === "string")
        return "string";
    return "object";
}
/**
 * Mirrors Rust `schema_covers_required`: every required property name must be
 * declared with a JSON type on both sides, and the two types must be equal.
 */
function covers(source, requiredNames, target) {
    return requiredNames.every(name => { const from = source.get(name); return from !== undefined && from === target.get(name); });
}
function stable(value) { if (Array.isArray(value))
    return `[${value.map(stable).join(",")}]`; if (value !== null && typeof value === "object")
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`; return JSON.stringify(value); }
async function digest(value) { const bytes = new TextEncoder().encode(stable(value)); const hash = await crypto.subtle.digest("SHA-256", bytes); return `sha256:${[...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, "0")).join("")}`; }
/** Creates only structural candidates; no capability name or natural-language inference is used. */
export async function browserLocalPlan(identity, snapshot, dependencies, target, startingFacts, workspaceId, appManifest) {
    if (dependencies.length > BROWSER_PLAN_MAX_DEPENDENCIES)
        throw new BrowserPlanError("browser_plan_verified_dependency_set_too_large", "prepared dependency set exceeds the fixed bound");
    if (new TextEncoder().encode(JSON.stringify(startingFacts)).byteLength > BROWSER_PLAN_MAX_FACT_BYTES)
        throw new BrowserPlanError("browser_plan_starting_facts_too_large", "starting facts exceed the fixed bound");
    if (identity.contract_schema_version !== SUPPORTED_BROWSER_PLAN_CONTRACT_SCHEMA_VERSION)
        throw new BrowserPlanError("browser_plan_unsupported_contract_schema_version", "unsupported contract schema version");
    if (snapshot.capabilities.length === 0)
        throw new BrowserPlanError("browser_plan_snapshot_empty", "synced registry snapshot contains no capabilities");
    if (identity.source_release !== snapshot.releaseTag)
        throw new BrowserPlanError("browser_plan_snapshot_evidence_stale", "snapshot release evidence is stale");
    if (identity.registry_snapshot_digest !== await digest(snapshot))
        throw new BrowserPlanError("browser_plan_snapshot_digest_mismatch", "snapshot digest does not match supplied snapshot");
    const declared = dependencies.map(dep => {
        let contract;
        try {
            contract = record(JSON.parse(new TextDecoder().decode(dep.contractBytes)));
        }
        catch {
            contract = null;
        }
        if (contract === null)
            throw new BrowserPlanError("browser_plan_verified_dependency_contract_invalid", "prepared dependency contract is invalid");
        if (dep.evidence.indexDigest !== identity.registry_snapshot_digest)
            throw new BrowserPlanError("browser_plan_verified_dependency_evidence_mismatch", "prepared dependency is bound to a different snapshot");
        const found = snapshot.capabilities.find(c => c.namespace === dep.evidence.namespace && c.id === dep.evidence.id && c.version === dep.evidence.selectedVersion && !c.deprecated);
        if (found === undefined)
            throw new BrowserPlanError("browser_plan_verified_dependency_not_in_snapshot", "prepared dependency is not active in snapshot");
        if (found.digest !== dep.wasmDigest || found.digest !== dep.evidence.artifactDigest)
            throw new BrowserPlanError("browser_plan_verified_dependency_digest_mismatch", "prepared dependency artifact digest drifted");
        const inputs = required(record(contract.inputs)?.schema);
        const inputTypes = propertyTypes(record(contract.inputs)?.schema);
        const outputTypes = propertyTypes(record(contract.outputs)?.schema);
        const emits = Array.isArray(contract.emits) ? contract.emits.flatMap(v => { const e = record(v); return typeof e?.event_id === "string" ? [e.event_id] : []; }) : [];
        return { id: found.id, version: found.version, digest: found.digest, inputs, inputTypes, outputTypes, emits };
    }).sort((a, b) => a.id.localeCompare(b.id) || a.version.localeCompare(b.version))
        .filter((candidate, index, all) => index === 0 || candidate.id !== all[index - 1].id || candidate.version !== all[index - 1].version);
    // Starting facts are values, unlike contract schemas; their own keys and
    // actual JSON types form the initial structural output schema (Rust
    // `starting_facts_output_schema`). Chain search MUST match Rust
    // `build_chains` in `browser_local_plan.rs`: the base case is against
    // starting facts only, predecessor coverage uses the predecessor's outputs
    // alone, and starting facts are never accumulated with a node's own outputs
    // (issue #1338).
    const factTypes = new Map(Object.entries(record(startingFacts) ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, jsonTypeName(value)]));
    const targets = declared.filter(c => (target.capability_id !== undefined && target.capability_version !== undefined && c.id === target.capability_id && c.version === target.capability_version) || (target.emits_event !== undefined && c.emits.includes(target.emits_event)));
    const chains = [];
    // Truncation must mean "candidates were excluded" (issue #1477). The search
    // therefore keeps going until it has seen one chain more than the candidate
    // bound, and separately records the eight-node depth cutoff, mirroring Rust
    // `build_chains`: it flags truncation only when `all_chains.len()` exceeds
    // PLAN_MAX_CANDIDATES or an edge is skipped at `remaining_budget <= 1`.
    const searchBound = BROWSER_PLAN_MAX_CANDIDATES + 1;
    let depthTruncated = false;
    let workTruncated = false;
    // Same defensive work bound as native PLAN_MAX_SEARCH_CALLS. Looking for
    // a sixth candidate must not exhaust an exponentially large dead graph.
    let searchCallsRemaining = 4_000;
    const visit = (node, chain) => {
        if (chains.length >= searchBound)
            return;
        if (searchCallsRemaining === 0) {
            workTruncated = true;
            return;
        }
        searchCallsRemaining -= 1;
        // Base case: covered by starting facts only — never by this node's outputs.
        if (covers(factTypes, node.inputs, node.inputTypes)) {
            chains.push([...chain, node]);
        }
        // Empty required inputs never gain predecessors (vacuous cover would invent edges).
        if (node.inputs.length === 0)
            return;
        for (const predecessor of declared) {
            if (chains.length >= searchBound)
                return;
            if (predecessor === node || chain.includes(predecessor))
                continue;
            // Predecessor outputs alone must cover this node's required inputs,
            // by both property name and declared JSON type.
            if (!covers(predecessor.outputTypes, node.inputs, node.inputTypes))
                continue;
            // The predecessor would be node number `chain.length + 2`; refusing it at
            // the bound is a real exclusion, so report it rather than hide it.
            if (chain.length + 1 >= BROWSER_PLAN_MAX_NODES) {
                depthTruncated = true;
                continue;
            }
            visit(predecessor, [...chain, node]);
        }
    };
    for (const candidate of targets)
        visit(candidate, []);
    const proposals = chains.slice(0, BROWSER_PLAN_MAX_CANDIDATES).map((chain, index) => {
        const ordered = [...chain].reverse();
        const nodes = ordered.map((c, n) => ({ node_id: `node-${n + 1}`, capability_id: c.id, capability_version: c.version, artifact_digest: c.digest }));
        const mappings = [];
        for (let n = 0; n < ordered.length; n += 1) {
            const node = ordered[n];
            for (const field of node.inputs) {
                // Only a prior node that declares this field with the consumer's own
                // declared JSON type may source the mapping; otherwise the field comes
                // from the starting facts (which the chain search already type-checked).
                const prior = ordered.slice(0, n).map((c, i) => ({ c, i })).reverse().find(({ c }) => covers(c.outputTypes, [field], node.inputTypes));
                mappings.push(prior ? { from_node_id: nodes[prior.i].node_id, from_field: field, to_node_id: nodes[n].node_id, to_field: field, source: "capability_output" } : { from_node_id: null, from_field: field, to_node_id: nodes[n].node_id, to_field: field, source: "starting_facts" });
            }
        }
        return { kind: "browser_workflow_proposal", schema_version: BROWSER_WORKFLOW_PROPOSAL_SCHEMA_VERSION, snapshot_digest: identity.registry_snapshot_digest, source_release: identity.source_release, mapping_unconfirmed: true, proposal: { kind: "workflow_proposal", schema_version: "1.0.0", proposal_id: `browser-plan-${index + 1}`, workspace_id: workspaceId, app_manifest: appManifest, nodes, edges: nodes.slice(1).map((node, n) => ({ from_node_id: nodes[n].node_id, to_node_id: node.node_id })), mappings, initial_input: startingFacts } };
    });
    return { proposals, plan_search_truncated: chains.length > BROWSER_PLAN_MAX_CANDIDATES || depthTruncated || workTruncated };
}
