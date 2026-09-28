import type { RegistryCacheStore, SyncedPublicRegistryState } from "./registryCache.js";
import type { BrowserWorkflowProposal } from "./browserLocalPlan.js";
import type { JsonValue } from "./types.js";
export declare const COMPOSED_WORKFLOW_MAX_NODES = 8;
export declare const COMPOSED_WORKFLOW_MAX_PAYLOAD_BYTES: number;
export type ComposedWorkflowErrorCode = "composed_workflow_snapshot_mismatch" | "composed_workflow_proposal_invalid" | "composed_workflow_missing_capability" | "composed_workflow_dependency_evidence_mismatch" | "composed_workflow_artifact_digest_drift" | "composed_workflow_dependency_contract_invalid" | "composed_workflow_registry_rejected_contract" | "composed_workflow_approval_required";
/** Stable, secret-free pre-execution refusal. */
export declare class ComposedWorkflowError extends Error {
    readonly code: ComposedWorkflowErrorCode;
    readonly node_id: string | null;
    constructor(code: ComposedWorkflowErrorCode, message: string, node_id?: string | null);
}
export interface ComposedWorkflowNodeOutcome {
    readonly node_id: string;
    readonly capability_id: string;
    readonly capability_version: string;
    readonly status: "succeeded" | "failed" | "not_started";
    readonly failure_class: string | null;
}
export interface ComposedWorkflowTrace {
    readonly terminal_state: "succeeded" | "failed";
    readonly snapshot_digest: string;
    readonly node_outcomes: readonly ComposedWorkflowNodeOutcome[];
}
export interface ComposedCapabilityEvent {
    readonly event_id: string;
    readonly version: string;
    readonly payload: JsonValue;
    readonly node_id: string;
    readonly capability_id: string;
    readonly capability_version: string;
}
export interface ComposedWorkflowExecutionOptions {
    /**
     * Verified `runtime.wasm` bytes (host-owned; never fetched by this module).
     * Required for FR-008 nested execution.
     */
    readonly runtimeWasmBytes: Uint8Array;
    /**
     * Called when a capability's nested `emit_event` is accepted and drained
     * from `runtime.wasm` (Decision 89 host publish). Offline composed
     * execution has no EmbedderCore; hosts that need subscribe()-style
     * delivery wire this callback.
     */
    readonly onCapabilityEvent?: (event: ComposedCapabilityEvent) => void;
}
/** Executes a reviewed proposal entirely offline against exact cache entries. */
export declare function executeBrowserComposedWorkflow(proposal: BrowserWorkflowProposal, store: RegistryCacheStore, snapshot: SyncedPublicRegistryState, options: ComposedWorkflowExecutionOptions): Promise<ComposedWorkflowTrace>;
