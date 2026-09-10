import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const sampleRoot = join(root, 'sounds samples');
const outputRoot = join(root, 'output', 'sample-evaluation');
const manifest = JSON.parse(await readFile(join(sampleRoot, 'manifest.json'), 'utf8'));
const profileArg = process.argv.indexOf('--profile');
const profile = profileArg >= 0 ? process.argv[profileArg + 1] : join(root, 'config', 'locations', 'golden-bc.json');
if (!profile || profile.startsWith('--')) throw new Error('--profile requires a location profile path');

const results = [];
for (const sample of manifest.samples) {
  const output = join(outputRoot, sample.id);
  const run = spawnSync(process.execPath, [join(root, 'scripts', 'analyze-audio.mjs'), join(sampleRoot, sample.path), output, '--candidates', profile], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`${sample.id}: analyzer failed\n${run.stderr}`);
  const evidence = JSON.parse(await readFile(join(output, `${sample.path.replace(/\.mp3$/i, '')}.evidence.json`), 'utf8'));
  const models = evidence.models.map(model => {
    const candidate = model.candidate_summary.find(item => item.taxon === sample.candidate_taxon);
    return { model_id: model.model_id, quality: model.quality_summary, candidate };
  });
  results.push({ id: sample.id, candidate_taxon: sample.candidate_taxon, models });
}

console.log(JSON.stringify({ profile, sample_count: results.length, results }, null, 2));
