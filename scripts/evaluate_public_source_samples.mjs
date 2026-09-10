import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, basename } from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const metadata = JSON.parse(await readFile(join(root, 'config/audio-source-candidates.json'), 'utf8'));
const profile = process.argv.includes('--profile') ? process.argv[process.argv.indexOf('--profile') + 1] : join(root, 'config/locations/golden-bc-expanded.json');
const results = [];
for (const record of metadata.records.filter((item) => item.status === 'downloaded_staged')) {
  const stem = basename(record.local_path).replace(/\.[^.]+$/, '');
  const output = join('/private/tmp/callweave-public-evaluation', stem);
  const run = spawnSync(process.execPath, [join(root, 'scripts/analyze-audio.mjs'), join(root, record.local_path), output, '--candidates', profile], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`${record.id}: analyzer failed\n${run.stderr}`);
  const evidence = JSON.parse(await readFile(join(output, `${stem}.evidence.json`), 'utf8'));
  results.push({ id: record.id, taxon: record.taxon, source: record.source, license: record.license, models: evidence.models.map((model) => ({ model_id: model.model_id, candidate: model.candidate_summary.find((candidate) => candidate.taxon === record.taxon) ?? null, quality: model.quality_summary })) });
}
console.log(JSON.stringify({ profile, sample_count: results.length, results }, null, 2));
