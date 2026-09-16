import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('config/model-candidates.json');
const document = JSON.parse(fs.readFileSync(file, 'utf8'));
const allowed = new Set(['allowed', 'forbidden', 'conditional', 'unknown', 'to_be_determined']);
if (document.policy !== 'evaluation-only-until-explicit-artifact-approval') throw new Error('candidate policy must remain evaluation-only');
if (!Array.isArray(document.candidates) || document.candidates.length < 3) throw new Error('candidate inventory is incomplete');
for (const candidate of document.candidates) {
  for (const field of ['candidate_id', 'family', 'source', 'license_status', 'commercial_use', 'artifact_status', 'deployment_status']) {
    if (!candidate[field]) throw new Error(`${candidate.candidate_id ?? 'candidate'} missing ${field}`);
  }
  if (!allowed.has(candidate.commercial_use)) throw new Error(`${candidate.candidate_id} has invalid commercial_use`);
  if (candidate.deployment_status === 'approved') throw new Error(`${candidate.candidate_id} cannot be approved in evaluation inventory`);
}
console.log(`model_candidates=passed count=${document.candidates.length} production_pins=0`);
