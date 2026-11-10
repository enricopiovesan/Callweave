import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as ort from 'onnxruntime-web';
import ffmpegPath from 'ffmpeg-static';

const [inputPath, outputPath = 'output/perch-evaluation.json'] = process.argv.slice(2);
const modelPath = process.env.PERCH_MODEL_PATH || '/tmp/callweave-perch-v2-int8.onnx';
const labelsPath = process.env.PERCH_LABELS_PATH || '/tmp/callweave-perch-labels.csv';
if (!inputPath) {
  console.error('Usage: PERCH_MODEL_PATH=/path/model.onnx npm run perch:onnx:evaluate -- <audio-file> [output-json]');
  process.exit(2);
}
const modelBytes = await readFile(modelPath);
const session = await ort.InferenceSession.create(modelBytes.buffer.slice(modelBytes.byteOffset, modelBytes.byteOffset + modelBytes.byteLength), { executionProviders: ['wasm'] });
const decoded = spawnSync(ffmpegPath, ['-v', 'error', '-i', resolve(inputPath), '-t', '5', '-ac', '1', '-ar', '32000', '-f', 'f32le', 'pipe:1'], { encoding: null, maxBuffer: 2 * 1024 * 1024 });
if (decoded.status !== 0) throw new Error(decoded.error?.message || decoded.stderr?.toString() || 'ffmpeg decode failed');
const waveform = new Float32Array(decoded.stdout.buffer, decoded.stdout.byteOffset, Math.floor(decoded.stdout.byteLength / 4));
const started = Date.now();
const outputs = await session.run({ inputs: new ort.Tensor('float32', waveform, [1, waveform.length]) });
const labels = (await readFile(labelsPath, 'utf8')).split(/\r?\n/).filter(Boolean).map(line => line.includes(',') ? line.slice(line.indexOf(',') + 1).replace(/^"|"$/g, '') : line);
const scores = outputs.label.data;
const topScores = Array.from(scores, (score, index) => ({ index, label: labels[index] || `class_${index}`, score: Number(score) }))
  .sort((a, b) => b.score - a.score).slice(0, 20);
const result = {
  status: 'evaluation_only',
  model: { source: 'https://huggingface.co/tphakala/Perch-v2-Models', artifact: 'perch_v2_int8_arm.onnx', bytes: modelBytes.length, runtime: 'onnxruntime-web-wasm' },
  input: { source: resolve(inputPath), sample_rate_hz: 32000, samples: waveform.length, duration_seconds: waveform.length / 32000 },
  inference_ms: Date.now() - started,
  outputs: Object.fromEntries(Object.entries(outputs).map(([key, value]) => [key, { dims: value.dims, type: value.type, elements: value.data.length }])),
  top_scores: topScores,
  interpretation: 'Frozen model evidence only; scores are uncalibrated and are not a verified animal observation.',
};
const output = resolve(outputPath);
await import('node:fs/promises').then(fs => fs.mkdir(resolve(output, '..'), { recursive: true }).then(() => writeFile(output, `${JSON.stringify(result, null, 2)}\n`)));
console.log(JSON.stringify({ status: result.status, output, inference_ms: result.inference_ms, top_scores: topScores.slice(0, 10) }, null, 2));
