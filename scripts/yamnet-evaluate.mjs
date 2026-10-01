import * as ort from 'onnxruntime-web';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log('Usage: npm run yamnet:evaluate -- <audio-file> [output-directory]');
  console.log('Optional: --max-seconds <n> bounds decoding/inference (default: 600).');
  console.log('Runs the pinned local YAMNet ONNX artifact as broad sound-event evidence.');
  process.exit(args.length === 0 ? 2 : 0);
}

const maxFlag = args.indexOf('--max-seconds');
const maxSeconds = maxFlag >= 0 ? Number(args[maxFlag + 1]) : 600;
if (!Number.isFinite(maxSeconds) || maxSeconds <= 0) throw new Error('--max-seconds must be positive');
const positional = args.filter((value, index) => index !== maxFlag && index !== maxFlag + 1);
const [audioArgument, outputArgument = 'output/yamnet'] = positional;
const root = resolve('.');
const audioPath = resolve(audioArgument);
const outputDirectory = resolve(outputArgument);
const modelPath = resolve(root, 'artifacts/model-candidates/yamnet-onnx-v1/yamnet.onnx');
const labelsPath = resolve(root, 'artifacts/model-candidates/yamnet-onnx-v1/yamnet_class_map.csv');
const expectedSha256 = 'd3835ffbbd4a1bb3e777f0ca217b5007907f5171dd5d17c4236b95b2af8f908e';

function decode16k() {
  return new Promise((resolveDecode, reject) => {
    const child = spawn(ffmpegPath, ['-v', 'error', '-i', audioPath, '-t', String(maxSeconds), '-ac', '1', '-ar', '16000', '-f', 'f32le', 'pipe:1']);
    const stdout = []; const stderr = [];
    child.stdout.on('data', chunk => stdout.push(chunk));
    child.stderr.on('data', chunk => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) return reject(new Error(`FFmpeg failed (${code}): ${Buffer.concat(stderr).toString()}`));
      const bytes = Buffer.concat(stdout);
      if (bytes.byteLength % 4 !== 0) return reject(new Error('FFmpeg produced invalid float32 PCM'));
      resolveDecode(new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4).slice());
    });
  });
}

function parseLabels(csv) {
  return csv.trim().split(/\r?\n/).slice(1).map(line => {
    const match = line.match(/^([^,]+),([^,]+),"?(.*)"?$/);
    if (!match) throw new Error(`Invalid YAMNet label row: ${line}`);
    return { index: Number(match[1]), mid: match[2], display_name: match[3].replace(/^"|"$/g, '') };
  });
}

function rms(samples) {
  if (!samples.length) return 0;
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / samples.length);
}

const modelBytes = await readFile(modelPath);
const modelSha256 = createHash('sha256').update(modelBytes).digest('hex');
if (modelSha256 !== expectedSha256) throw new Error(`YAMNet digest mismatch: expected ${expectedSha256}, got ${modelSha256}`);
const labels = parseLabels(await readFile(labelsPath, 'utf8'));
if (labels.length !== 521) throw new Error(`Expected 521 YAMNet labels, got ${labels.length}`);

const samples = await decode16k();
const session = await ort.InferenceSession.create(modelPath, { executionProviders: ['wasm'] });
const inputName = session.inputNames[0];
const chunkSamples = 16000 * 10;
const scoreFrames = [];
for (let offset = 0; offset < samples.length || offset === 0; offset += chunkSamples) {
  const chunk = samples.subarray(offset, Math.min(samples.length, offset + chunkSamples));
  const output = await session.run({ [inputName]: new ort.Tensor('float32', chunk, [chunk.length]) });
  const scores = output[session.outputNames[0]];
  if (!scores || scores.dims.length !== 2 || scores.dims[1] !== 521) throw new Error('Unexpected YAMNet score output shape');
  for (let frame = 0; frame < scores.dims[0]; frame += 1) scoreFrames.push(Array.from(scores.data.slice(frame * 521, (frame + 1) * 521)));
  if (chunk.length < chunkSamples) break;
}
const frameCount = scoreFrames.length;
const aggregate = labels.map((label, index) => {
  const values = scoreFrames.map(frame => Number(frame[index]));
  return { ...label, max_score: Math.max(...values), mean_score: values.reduce((sum, value) => sum + value, 0) / values.length };
});
const top = aggregate.sort((a, b) => b.max_score - a.max_score).slice(0, 20);
const meanTop = [...aggregate].sort((a, b) => b.mean_score - a.mean_score).slice(0, 20);
const animalRelated = aggregate
  .filter(item => /animal|bird|mammal|insect|frog|toad|reptile|amphibian|wildlife|elk|bear|fox|coyote|deer|moose|wolf|cat|dog/i.test(item.display_name))
  .sort((a, b) => b.mean_score - a.mean_score)
  .slice(0, 20);
const report = {
  schema_version: '1.0.0',
  kind: 'yamnet_broad_sound_event_evidence',
  authority: 'model evidence only; not a verified animal observation',
  source: { filename: basename(audioPath), sample_rate_hz: 16000, samples: samples.length, duration_seconds: samples.length / 16000, max_seconds: maxSeconds, truncated: samples.length >= maxSeconds * 16000, rms: rms(samples) },
  model: { model_id: 'audio.yamnet.event-gate', version: '1.0.0-onnx-evaluation', artifact_sha256: `sha256:${modelSha256}`, license: 'Apache-2.0', ontology_license: 'CC-BY-4.0', target: 'onnx-evaluation-only' },
  output: { frame_count: frameCount, frame_seconds: 0.96, hop_seconds: 0.48, top, mean_top: meanTop, animal_related: animalRelated },
  classification: { status: 'evidence_only', species_identification: false, next_stage: 'configured_specialist_model' },
};
await mkdir(outputDirectory, { recursive: true });
const stem = basename(audioPath).replace(/\.[^.]+$/, '');
const jsonPath = resolve(outputDirectory, `${stem}.yamnet.json`);
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: 'passed', evidence: jsonPath, frames: frameCount, top: top.slice(0, 5), animal_related: animalRelated.slice(0, 5) }, null, 2));
