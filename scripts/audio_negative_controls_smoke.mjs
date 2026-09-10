import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const work = '/private/tmp/callweave-negative-controls';
const profileArg = process.argv.indexOf('--profile');
const profile = profileArg >= 0 ? process.argv[profileArg + 1] : join(root, 'config', 'locations', 'golden-bc-expanded.json');
if (!profile || profile.startsWith('--')) throw new Error('--profile requires a location profile path');
const rate = 16_000;
const seconds = 2;

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((value, index) => data.writeInt16LE(value, index * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

await mkdir(work, { recursive: true });
const silence = new Int16Array(rate * seconds);
const tone = Int16Array.from({ length: rate * seconds }, (_, i) => Math.round(Math.sin(i * 2 * Math.PI * 440 / rate) * 12000));
for (const [name, samples] of [['silence', silence], ['steady-tone', tone]]) {
  const input = join(work, `${name}.wav`);
  const output = join(work, name);
  await writeFile(input, wav(samples));
  const run = spawnSync(process.execPath, [join(root, 'scripts', 'analyze-audio.mjs'), input, output, '--candidates', profile], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`${name}: analyzer failed\n${run.stderr}`);
  const evidence = JSON.parse(await readFile(join(output, `${name}.evidence.json`), 'utf8'));
  if (evidence.classification?.status !== 'unknown' || evidence.classification?.requires_human_confirmation !== true) {
    throw new Error(`${name}: uncalibrated evidence must remain unknown`);
  }
  if (!evidence.models.every((model) => model.quality_summary)) throw new Error(`${name}: missing quality summary`);
  if (name === 'silence' && !evidence.models.every((model) => model.quality_summary.quiet_windows > 0)) {
    throw new Error('silence: expected quiet windows');
  }
}
console.log('audio_negative_controls_smoke=passed controls=silence,steady-tone');
