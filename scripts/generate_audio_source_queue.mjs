import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const plan = JSON.parse(await readFile(join(root, 'config/test-corpus/golden-expansion.json'), 'utf8'));
const records = plan.taxa.map((entry) => ({
  taxon: entry.taxon,
  common_name: entry.common_name,
  class: entry.class,
  priority: entry.priority,
  target_recordings: plan.policy.minimum_recordings_per_taxon,
  accepted_licenses: plan.policy.redistributable_licenses,
  evaluation_only_licenses: plan.policy.evaluation_only_licenses,
  sources: [
    { name: 'iNaturalist', query_url: `https://www.inaturalist.org/observations?taxon_name=${encodeURIComponent(entry.taxon)}&sounds=true&sound_license=cc0,cc-by`, media_license_must_be_verified: true },
    { name: 'Xeno-canto', query_url: `https://xeno-canto.org/explore?query=${encodeURIComponent(entry.taxon)}`, media_license_must_be_verified: true },
    { name: 'Macaulay Library', query_url: `https://search.macaulaylibrary.org/catalog?mediaType=audio&otherAnimalsOnly=true&searchField=species&value=${encodeURIComponent(entry.taxon)}`, media_license_must_be_verified: true }
  ],
  status: 'queued_metadata_only'
}));
const output = join(root, 'config/test-corpus/audio-source-queue.json');
await mkdir(join(root, 'config/test-corpus'), { recursive: true });
await writeFile(output, `${JSON.stringify({
  schema_version: '1.0.0',
  kind: 'audio_source_acquisition_queue',
  generated_at: new Date().toISOString(),
  location_profile: plan.location_profile,
  policy: plan.policy,
  records
}, null, 2)}\n`);
console.log(`audio_source_queue=generated taxa=${records.length} target_recordings=${records.reduce((sum, record) => sum + record.target_recordings, 0)}`);
