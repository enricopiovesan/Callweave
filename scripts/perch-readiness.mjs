import * as ort from 'onnxruntime-web';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const [modelPath] = process.argv.slice(2);
if (!modelPath) {
  console.error('Usage: npm run perch:readiness -- <local-model.onnx>');
  process.exit(2);
}

const resolvedModelPath = resolve(modelPath);
const modelDirectory = dirname(resolvedModelPath);
const lock = JSON.parse(await readFile(resolve(modelDirectory, 'MODEL_LOCK.json'), 'utf8'));
const modelSha256 = createHash('sha256').update(await readFile(resolvedModelPath)).digest('hex');
if (modelSha256 !== lock.integrity.sha256) {
  throw new Error(`Model checksum mismatch: expected ${lock.integrity.sha256}, received ${modelSha256}`);
}
const labels = (await readFile(resolve(modelDirectory, 'labels.txt'), 'utf8')).trim().split(/\r?\n/);
if (labels.length !== lock.interface.labels_count) {
  throw new Error(`Label count mismatch: expected ${lock.interface.labels_count}, received ${labels.length}`);
}
if (labels[0] !== lock.interface.labels_header) {
  throw new Error(`Labels header mismatch: expected ${lock.interface.labels_header}, received ${labels[0]}`);
}

const started = performance.now();
const session = await ort.InferenceSession.create(resolvedModelPath, { executionProviders: ['wasm'] });
const inputName = session.inputNames[0];
const [batch, samples] = lock.interface.input_shape;
const output = await session.run({ [inputName]: new ort.Tensor('float32', new Float32Array(samples), [batch, samples]) });
const classificationScores = output[lock.interface.classification_output_tensor];
if (!classificationScores || classificationScores.dims.at(-1) !== lock.interface.classification_labels_count) {
  throw new Error('Classification output and effective label count do not match');
}
console.log(JSON.stringify({
  runtime: 'onnxruntime-web-wasm',
  model_id: lock.id,
  model_sha256: modelSha256,
  license: lock.license.spdx,
  input_name: inputName,
  output_names: Object.keys(output),
  output_dimensions: Object.fromEntries(Object.entries(output).map(([name, tensor]) => [name, tensor.dims])),
  cold_load_and_inference_ms: Math.round(performance.now() - started),
  input_samples: samples,
  sample_rate_hz: lock.interface.sample_rate_hz,
  labels_file_lines: labels.length,
  classification_labels_count: labels.length - 1,
}, null, 2));
