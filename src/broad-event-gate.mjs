import { stableId } from './stable-id.mjs';

function required(value, name) {
  if (!value || typeof value !== 'object') throw new Error(`${name} is required`);
}

/** Map arbitrary broad sound-event evidence to configured model families. */
export function classifyBroadEvent({ evidence, rules, threshold = 0.2, minimumMargin = 0.05 }) {
  required(evidence, 'evidence');
  if (!Array.isArray(evidence.labels) || !Array.isArray(rules)) throw new Error('evidence.labels and rules are required');
  const labels = evidence.labels.map(label => ({
    name: String(label.name ?? label.display_name ?? '').toLowerCase(),
    score: Number(label.score ?? label.mean_score ?? 0),
  })).filter(label => label.name && Number.isFinite(label.score));
  const candidates = rules.map(rule => {
    const terms = rule.terms.map(term => String(term).toLowerCase());
    const matches = labels.filter(label => terms.some(term => label.name.includes(term)));
    const score = matches.length ? Math.max(...matches.map(match => match.score)) : 0;
    return { event_family: rule.event_family, score: Number(score.toFixed(6)), matched_labels: matches.map(match => match.name).sort() };
  }).sort((a, b) => b.score - a.score || a.event_family.localeCompare(b.event_family));
  const top = candidates[0] ?? null;
  const next = candidates[1] ?? null;
  const margin = top ? top.score - (next?.score ?? 0) : 0;
  const status = top && top.score >= threshold && margin >= minimumMargin ? 'route' : 'unknown';
  return {
    gate_id: stableId('broad-event-gate', { evidence, rules, threshold, minimumMargin }),
    status,
    event_family: status === 'route' ? top.event_family : null,
    confidence: top?.score ?? 0,
    margin: Number(margin.toFixed(6)),
    candidates,
  };
}
