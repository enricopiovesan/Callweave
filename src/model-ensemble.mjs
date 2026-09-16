import { stableId } from './stable-id.mjs';

export function routeModelFamilies({ event_family, models }) {
  if (!event_family || !Array.isArray(models)) throw new Error('event_family and models are required');
  return models.filter(model => model.enabled !== false && (model.families ?? []).includes(event_family))
    .sort((a, b) => a.priority - b.priority || a.model_id.localeCompare(b.model_id))
    .map(({ model_id, version, digest, family, priority = 0 }) => ({ model_id, version, digest, family, priority }));
}

export function fuseModelCandidates({ results, policy = {} }) {
  if (!Array.isArray(results)) throw new Error('results must be an array');
  const grouped = new Map();
  for (const result of results) {
    if (!result?.model_id || !Array.isArray(result.candidates)) continue;
    for (const candidate of result.candidates) {
      if (!candidate?.taxon || !Number.isFinite(candidate.score)) continue;
      const row = grouped.get(candidate.taxon) ?? { taxon: candidate.taxon, scores: [], supporting_models: [] };
      row.scores.push(Math.max(0, Math.min(1, candidate.score)));
      if (!row.supporting_models.includes(result.model_id)) row.supporting_models.push(result.model_id);
      grouped.set(candidate.taxon, row);
    }
  }
  const fused = [...grouped.values()].filter(row => row.supporting_models.length >= (policy.minimum_model_support ?? 1)).map(row => ({
    taxon: row.taxon,
    score: Number((row.scores.reduce((sum, score) => sum + score, 0) / row.scores.length).toFixed(6)),
    supporting_models: row.supporting_models.sort(),
  })).sort((a, b) => b.score - a.score || a.taxon.localeCompare(b.taxon));
  return { fusion_id: stableId('model-fusion', { results, policy }), candidates: fused, model_count: results.length };
}

export function applyUnknownGate({ candidates, threshold = 0.6, minimum_margin = 0.1 }) {
  if (!Array.isArray(candidates)) throw new Error('candidates must be an array');
  const top = candidates[0] ?? null;
  const next = candidates[1] ?? null;
  const margin = top ? top.score - (next?.score ?? 0) : 0;
  if (!top || top.score < threshold || margin < minimum_margin) return { status: 'unknown', top_candidate: top, margin: Number(margin.toFixed(6)) };
  return { status: 'candidate', top_candidate: top, margin: Number(margin.toFixed(6)) };
}
