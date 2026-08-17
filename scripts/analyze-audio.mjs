import * as ort from 'onnxruntime-web';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const [audioPath, outputPath = 'output'] = process.argv.slice(2);
if (!audioPath) {
  console.error('Usage: npm run analyze:audio -- <audio-file> [output-directory]');
  process.exit(2);
}

const root = resolve('.');
const sourcePath = resolve(audioPath);
const outputDirectory = resolve(outputPath);
const audioSha256 = createHash('sha256').update(await readFile(sourcePath)).digest('hex');

function decode(sampleRate) {
  return new Promise((resolveDecode, reject) => {
    const child = spawn(ffmpegPath, ['-v', 'error', '-i', sourcePath, '-ac', '1', '-ar', String(sampleRate), '-f', 'f32le', 'pipe:1']);
    const stdout = []; const stderr = [];
    child.stdout.on('data', chunk => stdout.push(chunk)); child.stderr.on('data', chunk => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', code => {
      const data = Buffer.concat(stdout);
      if (code !== 0) return reject(new Error(`FFmpeg failed (${code}): ${Buffer.concat(stderr).toString()}`));
      if (data.byteLength % 4 !== 0) return reject(new Error('FFmpeg produced a non-float32-aligned buffer'));
      return resolveDecode(new Float32Array(data.buffer, data.byteOffset, data.byteLength / 4).slice());
    });
  });
}

function windowed(samples, size) {
  const count = Math.max(1, Math.ceil(samples.length / size));
  return Array.from({ length: count }, (_, index) => {
    const clip = new Float32Array(size);
    const source = samples.subarray(index * size, (index + 1) * size);
    clip.set(source);
    return { clip, validSamples: source.length };
  });
}

async function loadModel(directory, filename) {
  const lock = JSON.parse(await readFile(resolve(directory, 'MODEL_LOCK.json'), 'utf8'));
  const modelPath = resolve(directory, filename);
  const actualHash = createHash('sha256').update(await readFile(modelPath)).digest('hex');
  if (actualHash !== lock.integrity.sha256) throw new Error(`${lock.id}: checksum mismatch`);
  const rawLabels = (await readFile(resolve(directory, 'labels.txt'), 'utf8')).trim().split(/\r?\n/);
  const labels = lock.interface.labels_header ? rawLabels.slice(1) : rawLabels;
  const expected = lock.interface.classification_labels_count ?? lock.interface.labels_count;
  if (labels.length !== expected) throw new Error(`${lock.id}: effective label count mismatch`);
  const session = await ort.InferenceSession.create(modelPath, { executionProviders: ['wasm'] });
  return { lock, labels, session };
}

async function classify(model, samples) {
  const { lock, labels, session } = model;
  const [batch, sampleCount] = lock.interface.input_shape;
  const input = session.inputNames[0];
  const scoreOutput = lock.interface.classification_output_tensor ?? session.outputNames[0];
  const results = [];
  for (const [index, { clip, validSamples }] of windowed(samples, sampleCount).entries()) {
    const output = await session.run({ [input]: new ort.Tensor('float32', clip, [batch, sampleCount]) });
    const values = output[scoreOutput].data;
    const top = Array.from(values, (rawLogit, labelIndex) => ({ rawLogit, labelIndex }))
      .sort((a, b) => b.rawLogit - a.rawLogit).slice(0, 5)
      .map(({ rawLogit, labelIndex }) => ({ label: labels[labelIndex], raw_logit: rawLogit }));
    results.push({
      start_millis: index * lock.interface.clip_duration_seconds * 1000,
      end_millis: Math.round((index * sampleCount + validSamples) / lock.interface.sample_rate_hz * 1000),
      valid_input_millis: Math.round(validSamples / lock.interface.sample_rate_hz * 1000),
      zero_padded: validSamples < sampleCount,
      top,
    });
  }
  return results;
}

const birdnet = await loadModel(resolve(root, 'models/birdnet'), 'birdnet.onnx');
const perch = await loadModel(resolve(root, 'models/perch'), 'perch.onnx');
const [birdnetSamples, perchSamples] = await Promise.all([decode(48000), decode(32000)]);
const report = {
  schema_version: '1.0.0',
  kind: 'local_acoustic_evidence',
  source: { filename: basename(sourcePath), sha256: audioSha256, raw_audio_included: false },
  authority: 'model evidence only; not a verified animal observation',
  score_semantics: 'Top raw logits sorted descending. They are ranking evidence only, not calibrated probabilities; this output must not be sent to a policy threshold until a location/model calibration is supplied.',
  models: [
    { model_id: birdnet.lock.id, license: birdnet.lock.license.spdx, sample_rate_hz: 48000, windows: await classify(birdnet, birdnetSamples) },
    { model_id: perch.lock.id, license: perch.lock.license.spdx, sample_rate_hz: 32000, windows: await classify(perch, perchSamples) },
  ],
  review_package: { status: 'blocked_pending_local_speech_privacy_protection', raw_audio_exported: false },
};

await mkdir(outputDirectory, { recursive: true });
const stem = basename(sourcePath).replace(/\.[^.]+$/, '');
const jsonPath = resolve(outputDirectory, `${stem}.evidence.json`);
const mdPath = resolve(outputDirectory, `${stem}.unknown-review.md`);
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(mdPath, `# Callweave local acoustic evidence\n\n- Source SHA-256: \`${audioSha256}\`\n- Status: model evidence only; no verified observation.\n- External LMM package: **blocked** pending local speech/privacy protection. Raw audio is intentionally excluded.\n- Evidence JSON: \`${basename(jsonPath)}\`\n`);
const zipPath = resolve(outputDirectory, `${stem}.unknown-review.zip`);
const zip = spawnSync('/usr/bin/zip', ['-j', '-q', zipPath, jsonPath, mdPath]);
if (zip.status !== 0) throw new Error(`ZIP creation failed: ${zip.stderr}`);
console.log(JSON.stringify({ evidence: jsonPath, review_markdown: mdPath, review_zip: zipPath, privacy_status: report.review_package.status }, null, 2));
