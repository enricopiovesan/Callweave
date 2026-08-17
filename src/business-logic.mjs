import { createHash } from 'node:crypto';

const stableId = (kind, value) => `${kind}-${createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16)}`;
const requireValue = (value, name) => { if (value === undefined || value === null || value === '') throw new Error(`${name} is required`); return value; };

/** Pure location/candidate-set policy. Sources are supplied by a host adapter. */
export function initializeLocation({ location, sources, policy }) {
  requireValue(location?.id, 'location.id'); requireValue(policy?.version, 'policy.version');
  if (!Array.isArray(sources) || sources.some(source => !source.license || !source.taxon || !source.status)) throw new Error('every source needs license, taxon, and status');
  const candidates = sources.map(source => ({ taxon: source.taxon, status: source.status, source_id: source.id, season: source.season ?? 'all' }))
    .sort((a, b) => a.taxon.localeCompare(b.taxon) || a.source_id.localeCompare(b.source_id));
  return { id: stableId('candidate-set', { location: location.id, policy: policy.version, candidates }), location_id: location.id, policy_version: policy.version, candidates };
}

/** Never promotes an uncalibrated logit; only a supplied calibrated score can cross policy thresholds. */
export function resolveDetection({ evidence, candidate, policy }) {
  requireValue(evidence?.id, 'evidence.id'); requireValue(policy?.version, 'policy.version');
  if (evidence.hardware_compatible === false) return outcome(evidence.id, 'rejected', 'hardware_incompatible', policy.version);
  if (evidence.calibrated_score_millis === undefined) return outcome(evidence.id, 'unknown', 'uncalibrated_evidence', policy.version);
  if (candidate?.status === 'rare' && evidence.calibrated_score_millis >= policy.minimum_score_millis) return outcome(evidence.id, 'surprising', 'rare_candidate', policy.version);
  if (!candidate || candidate.status === 'absent') return outcome(evidence.id, 'unknown', 'candidate_not_listed', policy.version);
  return evidence.calibrated_score_millis >= policy.minimum_score_millis
    ? outcome(evidence.id, 'provisional', 'score_meets_policy', policy.version)
    : outcome(evidence.id, 'unknown', 'score_below_policy', policy.version);
}
function outcome(evidenceId, state, reason, version) { return { id: stableId('resolution', { evidenceId, state, reason, version }), evidence_id: evidenceId, state, reason, policy_version: version }; }

/** Append-only observation decision; durable persistence is host-owned. */
export function manageObservation({ resolution, reviewer, previous = null }) {
  requireValue(resolution?.id, 'resolution.id'); requireValue(reviewer?.decision, 'reviewer.decision');
  if (reviewer.decision === 'verify' && resolution.state !== 'provisional') throw new Error('only provisional evidence may be verified');
  const revision = (previous?.revision ?? 0) + 1;
  return { id: stableId('observation', { resolution: resolution.id, reviewer: reviewer.id, revision }), revision, supersedes: previous?.id ?? null, resolution_id: resolution.id, state: reviewer.decision === 'verify' ? 'verified' : reviewer.decision === 'reject' ? 'rejected' : 'provisional', reviewer_id: reviewer.id ?? null };
}

/** Human approval is mandatory for durable knowledge changes. */
export function manageKnowledge({ proposal, approval, previousVersion = 0 }) {
  requireValue(proposal?.id, 'proposal.id'); requireValue(approval?.decision, 'approval.decision'); requireValue(approval?.reviewer_id, 'approval.reviewer_id');
  if (approval.decision !== 'approve') return { applied: false, proposal_id: proposal.id, reason: 'human_approval_required' };
  const version = previousVersion + 1;
  return { applied: true, id: stableId('knowledge', { proposal: proposal.id, version }), version, proposal_id: proposal.id, approved_by: approval.reviewer_id };
}

/** A local-day closure is deterministic and idempotent over the supplied watermark. */
export function closeDay({ locationId, localDate, coverage, observationIds = [], unknownIds = [], watermark, policy }) {
  requireValue(locationId, 'locationId'); requireValue(localDate, 'localDate'); requireValue(watermark, 'watermark'); requireValue(policy?.version, 'policy.version');
  const idempotencyKey = `${locationId}:${localDate}:${watermark}`;
  return { id: stableId('daily-close', { idempotencyKey, coverage, observationIds, unknownIds, policy: policy.version }), idempotency_key: idempotencyKey, location_id: locationId, local_date: localDate, coverage, observation_ids: [...observationIds].sort(), unknown_ids: [...unknownIds].sort(), policy_version: policy.version };
}

/** Review packages fail closed until a supplied privacy decision permits exact assets. */
export function prepareReview({ cluster, privacy, policy }) {
  requireValue(cluster?.id, 'cluster.id'); requireValue(privacy?.state, 'privacy.state'); requireValue(policy?.version, 'policy.version');
  if (privacy.state !== 'protected') return { allowed: false, cluster_id: cluster.id, reason: 'privacy_not_protected', policy_version: policy.version, assets: [] };
  return { allowed: true, cluster_id: cluster.id, policy_version: policy.version, assets: [...(privacy.sanitized_assets ?? [])].sort() };
}
