import assert from 'node:assert/strict';
import { applyUnknownGate, fuseModelCandidates, routeModelFamilies } from '../src/model-ensemble.mjs';

const models = [
  { model_id: 'mammal-golden', version: '1.0.0', digest: 'sha256:aaa', family: 'mammal', families: ['mammal'], priority: 2 },
  { model_id: 'general-audio', version: '1.0.0', digest: 'sha256:bbb', family: 'general', families: ['mammal', 'insect'], priority: 1 },
  { model_id: 'disabled', version: '1.0.0', digest: 'sha256:ccc', family: 'mammal', families: ['mammal'], enabled: false, priority: 0 },
];
assert.deepEqual(routeModelFamilies({ event_family: 'mammal', models }).map(model => model.model_id), ['general-audio', 'mammal-golden']);
const fused = fuseModelCandidates({ results: [
  { model_id: 'general-audio', candidates: [{ taxon: 'Cervus canadensis', score: 0.8 }, { taxon: 'Ursus americanus', score: 0.2 }] },
  { model_id: 'mammal-golden', candidates: [{ taxon: 'Cervus canadensis', score: 0.9 }] },
] });
assert.equal(fused.candidates[0].taxon, 'Cervus canadensis');
assert.equal(applyUnknownGate({ candidates: fused.candidates, threshold: 0.7, minimum_margin: 0.1 }).status, 'candidate');
assert.equal(applyUnknownGate({ candidates: [{ taxon: 'x', score: 0.65 }], threshold: 0.7 }).status, 'unknown');
console.log('model_ensemble=passed routing=family fusion=deterministic unknown_gate=fail_closed');
