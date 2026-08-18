import { stableId } from './stable-id.mjs';
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

/** Deterministic local clustering over supplied embeddings; it never claims a taxon. */
export function clusterUnknownEvidence({ items, policy }) {
  requireValue(policy?.version, 'policy.version');
  if (!Array.isArray(items) || items.length === 0) return [];
  const size = items[0]?.embedding?.length;
  if (!size || items.some(item => !item.id || item.embedding.length !== size || item.embedding.some(value => !Number.isFinite(value)))) throw new Error('items require equal finite embeddings');
  const parent = items.map((_, index) => index);
  const find = index => parent[index] === index ? index : (parent[index] = find(parent[index]));
  const join = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[b] = a; };
  const cosine = (a, b) => { let dot = 0, aa = 0, bb = 0; for (let i = 0; i < a.length; i += 1) { dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2; } return aa && bb ? dot / Math.sqrt(aa * bb) : 0; };
  for (let a = 0; a < items.length; a += 1) for (let b = a + 1; b < items.length; b += 1) if (cosine(items[a].embedding, items[b].embedding) >= policy.minimum_cosine) join(a, b);
  const groups = new Map();
  items.forEach((item, index) => groups.set(find(index), [...(groups.get(find(index)) ?? []), item.id]));
  return [...groups.values()].map(memberIds => ({ id: stableId('unknown-cluster', { memberIds: [...memberIds].sort(), policy: policy.version }), member_ids: [...memberIds].sort(), representative_id: [...memberIds].sort()[0], policy_version: policy.version })).sort((a, b) => a.id.localeCompare(b.id));
}

/** Release/rollback decision over supplied evaluation facts; no model download or activation occurs here. */
export function evaluateModelRelease({ candidate, evaluation, policy, activeModelId = null }) {
  requireValue(candidate?.id, 'candidate.id'); requireValue(candidate?.sha256, 'candidate.sha256'); requireValue(candidate?.license, 'candidate.license'); requireValue(policy?.version, 'policy.version');
  if (candidate.status !== 'verified') return { decision: 'reject', reason: 'artifact_not_verified', active_model_id: activeModelId };
  if (!evaluation || evaluation.held_out_precision_millis < policy.minimum_precision_millis || evaluation.held_out_recall_millis < policy.minimum_recall_millis) return { decision: 'reject', reason: 'evaluation_below_threshold', active_model_id: activeModelId };
  return { decision: 'approve', reason: 'release_gate_passed', active_model_id: candidate.id, previous_model_id: activeModelId, release_id: stableId('model-release', { candidate: candidate.id, sha256: candidate.sha256, policy: policy.version }) };
}

/** Explainable daily-canvas input; rendering and persistence remain separate host operations. */
export function createDailyCanvasPlan({ close, policy }) {
  requireValue(close?.id, 'close.id'); requireValue(policy?.version, 'policy.version');
  const evidenceCount = close.observation_ids.length;
  const unknownCount = close.unknown_ids.length;
  return { id: stableId('canvas-plan', { close: close.id, policy: policy.version }), close_id: close.id, policy_version: policy.version, visual_facts: { evidence_count: evidenceCount, unknown_count: unknownCount, coverage: close.coverage, uncertainty_millis: evidenceCount + unknownCount ? Math.round(1000 * unknownCount / (evidenceCount + unknownCount)) : 1000 } };
}

/** Pure replay plan: the host executes only these idempotent actions. */
export function planRecovery({ expectedIds, completedIds = [], policy }) {
  requireValue(policy?.version, 'policy.version');
  const completed = new Set(completedIds);
  const replay_ids = [...new Set(expectedIds)].filter(id => !completed.has(id)).sort();
  return { policy_version: policy.version, replay_ids, action: replay_ids.length ? 'replay_missing_idempotently' : 'no_action' };
}

/** Privacy release gate over supplied, reviewer-labeled detector outcomes. */
export function evaluatePrivacyGate({ cases, policy }) {
  requireValue(policy?.version, 'policy.version');
  if (!Array.isArray(cases) || cases.length === 0) throw new Error('labeled privacy cases are required');
  if (cases.some(test => typeof test.contains_speech !== 'boolean' || typeof test.risk_detected !== 'boolean')) throw new Error('privacy cases require boolean speech and risk labels');
  const speech = cases.filter(test => test.contains_speech);
  const falseNegatives = speech.filter(test => !test.risk_detected).length;
  const falseNegativeMillis = speech.length ? Math.round(1000 * falseNegatives / speech.length) : 1000;
  const result = { policy_version: policy.version, total_cases: cases.length, speech_cases: speech.length, false_negatives: falseNegatives, false_negative_millis: falseNegativeMillis };
  if (speech.length < policy.minimum_speech_cases) return { ...result, decision: 'reject', reason: 'insufficient_speech_cases' };
  if (falseNegativeMillis > policy.maximum_false_negative_millis) return { ...result, decision: 'reject', reason: 'false_negative_limit_exceeded' };
  return { ...result, decision: 'approve_for_policy', reason: 'privacy_gate_passed' };
}
