import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const plan = JSON.parse(await readFile(join(root, 'config/test-corpus/golden-expansion.json'), 'utf8'));
const manifest = JSON.parse(await readFile(join(root, 'sounds samples/manifest.json'), 'utf8'));
const sources = JSON.parse(await readFile(join(root, 'config/audio-source-candidates.json'), 'utf8'));
const present = new Map();
for (const sample of manifest.samples) present.set(sample.candidate_taxon, (present.get(sample.candidate_taxon) ?? 0) + 1);
for (const record of sources.records.filter((item) => item.status === 'downloaded_staged')) present.set(record.taxon, (present.get(record.taxon) ?? 0) + 1);
const taxa = plan.taxa.map((entry) => ({
  taxon: entry.taxon,
  common_name: entry.common_name,
  class: entry.class,
  target: plan.policy.minimum_recordings_per_taxon,
  present: present.get(entry.taxon) ?? 0,
  remaining: Math.max(0, plan.policy.minimum_recordings_per_taxon - (present.get(entry.taxon) ?? 0)),
  status: (present.get(entry.taxon) ?? 0) >= plan.policy.minimum_recordings_per_taxon ? 'target_met' : 'needs_recordings'
}));
const totalTarget = taxa.reduce((sum, row) => sum + row.target, 0);
const totalPresent = taxa.reduce((sum, row) => sum + row.present, 0);
console.log(JSON.stringify({ schema_version: '1.0.0', kind: 'audio_test_corpus_status', location_profile: plan.location_profile, target_recordings: totalTarget, present_recordings: totalPresent, completion_ratio: totalPresent / totalTarget, redistributable_public_files: sources.records.filter((item) => item.status === 'downloaded_staged').length, user_evaluation_files: manifest.samples.length, taxa }, null, 2));
