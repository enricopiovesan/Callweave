/**
 * Spec `132-stateful-browser-placement` activation attestation for Browser
 * Stateful capabilities. Mirrors `traverse_runtime::stateful_browser`.
 */
/** Stable activation failure code (Spec 132 FR-003). */
export declare const STATEFUL_BROWSER_STORE_UNAVAILABLE: "stateful_browser_store_unavailable";
export type StatefulBrowserActivationReason = "missing_bound_store" | "non_indexeddb_backend" | "exclusive_lock_not_held" | "public_integrity_unavailable" | "store_closed";
/** Secret-free success evidence (Spec 132 FR-005). */
export interface StatefulBrowserActivationEvidence {
    readonly governing_spec: "132-stateful-browser-placement";
    readonly backend: "indexeddb";
    readonly exclusive_lock_held: true;
    readonly public_integrity_available: true;
    readonly outcome: "attested";
}
/** Fail-closed denial (Spec 132 FR-003/FR-005). */
export interface StatefulBrowserActivationDenial {
    readonly code: typeof STATEFUL_BROWSER_STORE_UNAVAILABLE;
    readonly governing_spec: "132-stateful-browser-placement";
    readonly outcome: "denied";
    readonly reason: StatefulBrowserActivationReason;
}
export type StatefulBrowserActivationResult = {
    readonly ok: true;
    readonly evidence: StatefulBrowserActivationEvidence;
} | {
    readonly ok: false;
    readonly error: StatefulBrowserActivationDenial;
};
/**
 * Attests Browser activation of a Stateful capability against a bound store.
 *
 * The store handle itself is inspected — an honor-system boolean is not enough
 * (Spec 132 FR-004). Evidence never includes DB names, payloads, or paths.
 */
export declare function attestStatefulBrowserActivation(boundStore: unknown): StatefulBrowserActivationResult;
