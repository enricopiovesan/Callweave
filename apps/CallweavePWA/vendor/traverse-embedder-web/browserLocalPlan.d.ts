/**
 * Offline, deterministic proposal construction for Spec 1277.  This module
 * deliberately has no loader, storage, or fetch dependency: the caller must
 * supply an already verified registry snapshot and prepared dependencies.
 */
import type { JsonValue } from "./types.js";
import type { SyncedPublicRegistryState, VerifiedRegistryDependency } from "./registryCache.js";
export declare const BROWSER_WORKFLOW_PROPOSAL_SCHEMA_VERSION = "1.0.0";
export declare const SUPPORTED_BROWSER_PLAN_CONTRACT_SCHEMA_VERSION = "1.0.0";
export declare const BROWSER_PLAN_MAX_CANDIDATES = 5;
export declare const BROWSER_PLAN_MAX_NODES = 8;
export declare const BROWSER_PLAN_MAX_FACT_BYTES: number;
export declare const BROWSER_PLAN_MAX_DEPENDENCIES = 128;
export interface BrowserPlanTarget {
    readonly capability_id?: string;
    readonly capability_version?: string;
    readonly emits_event?: string;
}
export interface BrowserSnapshotIdentity {
    readonly registry_snapshot_digest: string;
    readonly source_release: string;
    readonly contract_schema_version: string;
}
export interface BrowserProposalNode {
    readonly node_id: string;
    readonly capability_id: string;
    readonly capability_version: string;
    readonly artifact_digest: string;
}
export interface BrowserProposalMapping {
    readonly from_node_id: string | null;
    readonly from_field: string;
    readonly to_node_id: string;
    readonly to_field: string;
    readonly source: "starting_facts" | "capability_output";
}
export interface BrowserWorkflowProposal {
    readonly kind: "browser_workflow_proposal";
    readonly schema_version: string;
    readonly snapshot_digest: string;
    readonly source_release: string;
    readonly mapping_unconfirmed: boolean;
    readonly proposal: {
        readonly kind: "workflow_proposal";
        readonly schema_version: string;
        readonly proposal_id: string;
        readonly workspace_id: string;
        readonly app_manifest: JsonValue;
        readonly nodes: readonly BrowserProposalNode[];
        readonly edges: readonly {
            readonly from_node_id: string;
            readonly to_node_id: string;
        }[];
        readonly mappings: readonly BrowserProposalMapping[];
        readonly initial_input: JsonValue;
    };
}
export interface BrowserPlanResponse {
    readonly proposals: readonly BrowserWorkflowProposal[];
    readonly plan_search_truncated: boolean;
}
export type BrowserPlanErrorCode = "browser_plan_unsupported_contract_schema_version" | "browser_plan_snapshot_digest_mismatch" | "browser_plan_snapshot_empty" | "browser_plan_snapshot_evidence_stale" | "browser_plan_verified_dependency_contract_invalid" | "browser_plan_verified_dependency_not_in_snapshot" | "browser_plan_verified_dependency_digest_mismatch" | "browser_plan_verified_dependency_evidence_mismatch" | "browser_plan_starting_facts_too_large" | "browser_plan_verified_dependency_set_too_large";
export declare class BrowserPlanError extends Error {
    readonly code: BrowserPlanErrorCode;
    constructor(code: BrowserPlanErrorCode, message: string);
}
/** Creates only structural candidates; no capability name or natural-language inference is used. */
export declare function browserLocalPlan(identity: BrowserSnapshotIdentity, snapshot: SyncedPublicRegistryState, dependencies: readonly VerifiedRegistryDependency[], target: BrowserPlanTarget, startingFacts: JsonValue, workspaceId: string, appManifest: JsonValue): Promise<BrowserPlanResponse>;
