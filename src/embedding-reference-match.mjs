/**
 * Deterministic nearest-reference matching over supplied embeddings.
 * This is not training and never creates a classifier. Reference metadata is
 * retained so callers can audit the source and rights of every match.
 */
function finiteEmbedding(value, path) {
  if (!Array.isArray(value) || value.length === 0 || value.some(item => !Number.isFinite(item))) throw new Error(`${path} must be a non-empty finite embedding`);
  return value;
}

function cosine(left, right) {
  let dot = 0; let leftNorm = 0; let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / Math.sqrt(leftNorm * rightNorm);
}

export function matchEmbeddingReferences({ query_embedding, references, policy = {} }) {
  const query = finiteEmbedding(query_embedding, 'query_embedding');
  if (!Array.isArray(references)) throw new Error('references must be an array');
  const minimumSimilarity = Number.isFinite(policy.minimum_similarity) ? policy.minimum_similarity : 0.75;
  const minimumMargin = Number.isFinite(policy.minimum_margin) ? policy.minimum_margin : 0.05;
  const limit = Number.isInteger(policy.limit) && policy.limit > 0 ? policy.limit : 10;
  const matches = references.map((reference, index) => {
    if (!reference || typeof reference !== 'object') throw new Error(`references[${index}] must be an object`);
    if (typeof reference.reference_id !== 'string' || reference.reference_id.length === 0) throw new Error(`references[${index}].reference_id is required`);
    if (typeof reference.taxon !== 'string' || reference.taxon.length === 0) throw new Error(`references[${index}].taxon is required`);
    if (typeof reference.license_id !== 'string' || reference.license_id.length === 0) throw new Error(`references[${index}].license_id is required`);
    const embedding = finiteEmbedding(reference.embedding, `references[${index}].embedding`);
    if (embedding.length !== query.length) throw new Error(`references[${index}] embedding dimension mismatch`);
    return { reference_id: reference.reference_id, taxon: reference.taxon, source_ref: reference.source_ref ?? null, license_id: reference.license_id, similarity: Number(cosine(query, embedding).toFixed(6)) };
  }).sort((left, right) => right.similarity - left.similarity || left.reference_id.localeCompare(right.reference_id));
  const candidates = [];
  for (const match of matches) {
    const existing = candidates.find(candidate => candidate.taxon === match.taxon);
    if (existing) {
      existing.supporting_references.push(match.reference_id);
      existing.best_similarity = Math.max(existing.best_similarity, match.similarity);
    } else {
      candidates.push({ taxon: match.taxon, best_similarity: match.similarity, supporting_references: [match.reference_id], evidence: [match] });
    }
  }
  candidates.sort((left, right) => right.best_similarity - left.best_similarity || left.taxon.localeCompare(right.taxon));
  const top = candidates[0] ?? null;
  const next = candidates[1] ?? null;
  const margin = top ? Number((top.best_similarity - (next?.best_similarity ?? 0)).toFixed(6)) : 0;
  const status = top && top.best_similarity >= minimumSimilarity && margin >= minimumMargin ? 'candidate' : 'unknown';
  return { status, top_candidate: top, margin, candidates: candidates.slice(0, limit), policy: { minimum_similarity: minimumSimilarity, minimum_margin: minimumMargin, limit } };
}
