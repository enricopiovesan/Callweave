import * as ort from 'onnxruntime-web';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const args = process.argv.slice(2);
let candidateProfilePath;
const candidateFlag = args.indexOf('--candidates');
if (candidateFlag !== -1) {
  candidateProfilePath = args[candidateFlag + 1];
  args.splice(candidateFlag, 2);
}
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: npm run analyze:audio -- <audio-file> [output-directory]');
  console.log('Decodes local audio, runs local BirdNET and Perch models, and writes evidence outputs.');
  console.log('Optional: --candidates <location-profile.json> reports configured local taxa scores.');
  process.exit(0);
}

const [audioPath, outputPath = 'output'] = args;
if (!audioPath) {
  console.error('Usage: npm run analyze:audio -- <audio-file> [output-directory]');
  process.exit(2);
}

const root = resolve('.');
const sourcePath = resolve(audioPath);
const outputDirectory = resolve(outputPath);
const candidateProfile = candidateProfilePath
  ? JSON.parse(await readFile(resolve(candidateProfilePath), 'utf8'))
  : null;
const candidateTaxa = candidateProfile?.candidates ?? [];
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

function signalRms(samples) {
  if (!samples.length) return 0;
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / samples.length);
}

function signalPeak(samples) {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  return peak;
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

async function classify(model, samples, candidates) {
  const { lock, labels, session } = model;
  const [batch, sampleCount] = lock.interface.input_shape;
  const input = session.inputNames[0];
  const scoreOutput = lock.interface.classification_output_tensor ?? session.outputNames[0];
  const results = [];
  for (const [index, { clip, validSamples }] of windowed(samples, sampleCount).entries()) {
    const output = await session.run({ [input]: new ort.Tensor('float32', clip, [batch, sampleCount]) });
    const values = output[scoreOutput].data;
    const rms = signalRms(clip.subarray(0, validSamples));
    const peak = signalPeak(clip.subarray(0, validSamples));
    const ranked = Array.from(values, (rawLogit, labelIndex) => ({ rawLogit, labelIndex }));
    const top = ranked
      .sort((a, b) => b.rawLogit - a.rawLogit).slice(0, 5)
      .map(({ rawLogit, labelIndex }) => ({ label: labels[labelIndex], raw_logit: rawLogit }));
    const candidate_scores = candidates.map(candidate => {
      const labelIndex = labels.findIndex(label => label === candidate.taxon || label.split('_')[0] === candidate.taxon);
      if (labelIndex < 0) return { ...candidate, available: false, raw_logit: null, rank: null };
      const rawLogit = values[labelIndex];
      const rank = 1 + values.reduce((count, value) => count + (value > rawLogit ? 1 : 0), 0);
      return { ...candidate, available: true, raw_logit: rawLogit, rank };
    });
    results.push({
      start_millis: index * lock.interface.clip_duration_seconds * 1000,
      end_millis: Math.round((index * sampleCount + validSamples) / lock.interface.sample_rate_hz * 1000),
      valid_input_millis: Math.round(validSamples / lock.interface.sample_rate_hz * 1000),
      zero_padded: validSamples < sampleCount,
      signal_rms: Number(rms.toFixed(6)),
      signal_peak: Number(peak.toFixed(6)),
      clipped: peak >= 0.999,
      activity: rms < 0.005 ? 'quiet' : 'active',
      top,
      candidate_scores,
    });
  }
  return results;
}

function summarizeCandidates(windows) {
  const byTaxon = new Map();
  for (const window of windows) {
    for (const candidate of window.candidate_scores) {
      const current = byTaxon.get(candidate.taxon) ?? {
        taxon: candidate.taxon,
        common_name: candidate.common_name,
        status: candidate.status,
        available: candidate.available,
        scores: [],
        best_rank: null,
        supporting_windows: 0,
      };
      if (candidate.available) {
        current.scores.push({ raw_logit: candidate.raw_logit, active: window.activity === 'active' });
        current.best_rank = current.best_rank === null ? candidate.rank : Math.min(current.best_rank, candidate.rank);
        if (window.activity === 'active') current.supporting_windows += 1;
      }
      byTaxon.set(candidate.taxon, current);
    }
  }
  return [...byTaxon.values()].map(candidate => {
    const activeScores = candidate.scores.filter(score => score.active).map(score => score.raw_logit);
    const scores = candidate.scores.map(score => score.raw_logit);
    return {
      taxon: candidate.taxon,
      common_name: candidate.common_name,
      status: candidate.status,
      available: candidate.available,
      max_raw_logit: scores.length ? Math.max(...scores) : null,
      mean_active_raw_logit: activeScores.length ? activeScores.reduce((sum, score) => sum + score, 0) / activeScores.length : null,
      best_rank: candidate.best_rank,
      supporting_windows: candidate.supporting_windows,
    };
  }).sort((a, b) => (b.max_raw_logit ?? -Infinity) - (a.max_raw_logit ?? -Infinity));
}

function summarizeQuality(windows) {
  return {
    total_windows: windows.length,
    active_windows: windows.filter(window => window.activity === 'active').length,
    quiet_windows: windows.filter(window => window.activity === 'quiet').length,
    clipped_windows: windows.filter(window => window.clipped).length,
  };
}

const birdnet = await loadModel(resolve(root, 'models/birdnet'), 'birdnet.onnx');
const perch = await loadModel(resolve(root, 'models/perch'), 'perch.onnx');
const [birdnetSamples, perchSamples] = await Promise.all([decode(48000), decode(32000)]);
const birdnetWindows = await classify(birdnet, birdnetSamples, candidateTaxa);
const perchWindows = await classify(perch, perchSamples, candidateTaxa);
const modelEvidence = [
  { model_id: birdnet.lock.id, license: birdnet.lock.license.spdx, sample_rate_hz: 48000, windows: birdnetWindows, quality_summary: summarizeQuality(birdnetWindows), candidate_summary: summarizeCandidates(birdnetWindows) },
  { model_id: perch.lock.id, license: perch.lock.license.spdx, sample_rate_hz: 32000, windows: perchWindows, quality_summary: summarizeQuality(perchWindows), candidate_summary: summarizeCandidates(perchWindows) },
];
const candidateComparison = candidateTaxa.map(candidate => ({
  ...candidate,
  models: modelEvidence.map(model => ({
    model_id: model.model_id,
    ...model.candidate_summary.find(item => item.taxon === candidate.taxon),
  })),
}));
const report = {
  schema_version: '1.0.0',
  kind: 'local_acoustic_evidence',
  source: { filename: basename(sourcePath), sha256: audioSha256, raw_audio_included: false },
  authority: 'model evidence only; not a verified animal observation',
  score_semantics: 'Top raw logits sorted descending. They are ranking evidence only, not calibrated probabilities; this output must not be sent to a policy threshold until a location/model calibration is supplied.',
  models: modelEvidence,
  candidate_comparison: candidateComparison,
  review_package: { status: 'blocked_pending_local_speech_privacy_protection', raw_audio_exported: false },
};

await mkdir(outputDirectory, { recursive: true });
const stem = basename(sourcePath).replace(/\.[^.]+$/, '');
const jsonPath = resolve(outputDirectory, `${stem}.evidence.json`);
const mdPath = resolve(outputDirectory, `${stem}.unknown-review.md`);
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
const reviewCandidates = report.candidate_comparison
  .map(candidate => ({ ...candidate, perch: candidate.models.find(model => model?.model_id === 'perch-v2-multitaxa-int8-arm') }))
  .filter(candidate => candidate.perch?.available)
  .sort((a, b) => (b.perch.max_raw_logit ?? -Infinity) - (a.perch.max_raw_logit ?? -Infinity))
  .slice(0, 10)
  .map(candidate => `- ${candidate.common_name} (${candidate.taxon}, ${candidate.status}): max raw logit ${candidate.perch.max_raw_logit.toFixed(3)}, best rank ${candidate.perch.best_rank}`)
  .join('\n');
await writeFile(mdPath, `# Callweave local acoustic evidence\n\n- Source SHA-256: \`${audioSha256}\`\n- Status: model evidence only; no verified observation.\n- External LMM package: **blocked** pending local speech/privacy protection. Raw audio is intentionally excluded.\n- Evidence JSON: \`${basename(jsonPath)}\`\n\n## Configured local candidates\n\n${reviewCandidates || '- No configured candidate is available in the loaded model taxonomies.'}\n`);
const zipPath = resolve(outputDirectory, `${stem}.unknown-review.zip`);
const zip = spawnSync('/usr/bin/zip', ['-j', '-q', zipPath, jsonPath, mdPath]);
if (zip.status !== 0) throw new Error(`ZIP creation failed: ${zip.stderr}`);
console.log(JSON.stringify({ evidence: jsonPath, review_markdown: mdPath, review_zip: zipPath, privacy_status: report.review_package.status }, null, 2));
