/**
 * Spec `132-stateful-browser-placement` activation attestation for Browser
 * Stateful capabilities. Mirrors `traverse_runtime::stateful_browser`.
 */
import { IndexedDbDataStore } from "./indexedDbDataStore.js";
/** Stable activation failure code (Spec 132 FR-003). */
export const STATEFUL_BROWSER_STORE_UNAVAILABLE = "stateful_browser_store_unavailable";
function denial(reason) {
    return {
        ok: false,
        error: {
            code: STATEFUL_BROWSER_STORE_UNAVAILABLE,
            governing_spec: "132-stateful-browser-placement",
            outcome: "denied",
            reason,
        },
    };
}
/**
 * Attests Browser activation of a Stateful capability against a bound store.
 *
 * The store handle itself is inspected — an honor-system boolean is not enough
 * (Spec 132 FR-004). Evidence never includes DB names, payloads, or paths.
 */
export function attestStatefulBrowserActivation(boundStore) {
    if (boundStore === null || boundStore === undefined) {
        return denial("missing_bound_store");
    }
    if (!(boundStore instanceof IndexedDbDataStore)) {
        return denial("non_indexeddb_backend");
    }
    const facts = boundStore.openAttestation();
    if (facts.closed) {
        return denial("store_closed");
    }
    if (!facts.exclusive_lock_held) {
        return denial("exclusive_lock_not_held");
    }
    if (!facts.public_integrity_available) {
        return denial("public_integrity_unavailable");
    }
    return {
        ok: true,
        evidence: {
            governing_spec: "132-stateful-browser-placement",
            backend: "indexeddb",
            exclusive_lock_held: true,
            public_integrity_available: true,
            outcome: "attested",
        },
    };
}
