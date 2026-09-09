import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const sampleRoot = join(root, 'sounds samples');
const manifest = JSON.parse(await readFile(join(sampleRoot, 'manifest.json'), 'utf8'));

for (const sample of manifest.samples) {
  const bytes = await readFile(join(sampleRoot, sample.path));
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== sample.sha256) {
    throw new Error(`${sample.id}: SHA-256 mismatch (expected ${sample.sha256}, received ${digest})`);
  }
}

console.log(`sound_samples=valid count=${manifest.samples.length} provenance=${manifest.provenance_status}`);
