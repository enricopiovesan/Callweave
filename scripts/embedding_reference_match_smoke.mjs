import assert from 'node:assert/strict';
import { matchEmbeddingReferences } from '../src/embedding-reference-match.mjs';

const references = [
  { reference_id: 'elk-01', taxon: 'Cervus canadensis', embedding: [1, 0, 0], source_ref: 'sample:elk-01', license_id: 'CC0-1.0' },
  { reference_id: 'bear-01', taxon: 'Ursus americanus', embedding: [0, 1, 0], source_ref: 'sample:bear-01', license_id: 'CC0-1.0' },
  { reference_id: 'elk-02', taxon: 'Cervus canadensis', embedding: [0.98, 0.02, 0], source_ref: 'sample:elk-02', license_id: 'CC0-1.0' },
];
const happy = matchEmbeddingReferences({ query_embedding: [1, 0.02, 0], references, policy: { minimum_similarity: 0.8, minimum_margin: 0.05 } });
assert.equal(happy.status, 'candidate');
assert.equal(happy.top_candidate.taxon, 'Cervus canadensis');
assert.equal(happy.top_candidate.supporting_references.length, 2);
assert.equal(happy.top_candidate.evidence[0].license_id, 'CC0-1.0');
const unknown = matchEmbeddingReferences({ query_embedding: [0.7, 0.7, 0], references, policy: { minimum_similarity: 0.95, minimum_margin: 0.1 } });
assert.equal(unknown.status, 'unknown');
assert.throws(() => matchEmbeddingReferences({ query_embedding: [1, 0], references }), /dimension mismatch/);
console.log('embedding_reference_match=passed candidate=1 unknown=1 rights=preserved');
