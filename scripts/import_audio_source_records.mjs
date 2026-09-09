import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [inputPath, outputPath = 'config/audio-source-records.json'] = process.argv.slice(2);
if (!inputPath) {
  console.error('Usage: node scripts/import_audio_source_records.mjs <records.json> [output.json]');
  process.exit(2);
}

const input = JSON.parse(await readFile(resolve(inputPath), 'utf8'));
const allowed = new Set(['CC0-1.0', 'CC-BY-4.0', 'CC-BY-SA-4.0']);
const records = input.records ?? [];
if (!records.length) throw new Error('records.json must contain a non-empty records array');

for (const [index, record] of records.entries()) {
  for (const field of ['id', 'source', 'source_url', 'taxon', 'license', 'sha256']) {
    if (typeof record[field] !== 'string' || !record[field]) throw new Error(`records[${index}].${field} is required`);
  }
  if (!allowed.has(record.license)) throw new Error(`${record.id}: license ${record.license} is not approved for the reusable corpus`);
  if (!/^https?:\/\//.test(record.source_url)) throw new Error(`${record.id}: source_url must be an http(s) URL`);
  if (!/^[a-f0-9]{64}$/i.test(record.sha256)) throw new Error(`${record.id}: sha256 must be a 64-character hex digest`);
}

const output = {
  schema_version: '1.0.0',
  kind: 'licensed_audio_source_records',
  policy: 'only CC0, CC-BY, CC-BY-SA, or explicit compatible licenses may enter the reusable corpus',
  records: records.map(record => ({ ...record, redistribution_approved: true })),
};
await writeFile(resolve(outputPath), `${JSON.stringify(output, null, 2)}\n`);
console.log(`audio_source_records=approved count=${records.length} output=${resolve(outputPath)}`);
