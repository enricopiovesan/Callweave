import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const plan = JSON.parse(await readFile(join(root, 'config/test-corpus/golden-expansion.json'), 'utf8'));
const candidates = plan.taxa.filter((entry) => entry.class !== 'control').map((entry) => ({
  taxon: entry.taxon,
  common_name: entry.common_name,
  status: entry.priority === 'confirmed' || entry.priority === 'high' ? 'expected' : 'possible'
}));
const profile = {
  schema_version: '1.0.0',
  id: 'golden-bc-expanded',
  display_name: 'Golden, British Columbia (expanded wildlife candidates)',
  timezone: 'America/Edmonton',
  candidates,
  negative_controls: plan.negative_controls,
  source_plan: 'config/test-corpus/golden-expansion.json'
};
const output = join(root, 'config/locations/golden-bc-expanded.json');
await mkdir(join(root, 'config/locations'), { recursive: true });
await writeFile(output, `${JSON.stringify(profile, null, 2)}\n`);
console.log(`location_profile=generated id=${profile.id} candidates=${candidates.length}`);
