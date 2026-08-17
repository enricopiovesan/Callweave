import * as ort from 'onnxruntime-web';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const path = process.argv[2] ?? 'models/silero-vad/silero-vad.onnx';
const data = await readFile(path);
const session = await ort.InferenceSession.create(path, { executionProviders: ['wasm'] });
const output = await session.run({
  input: new ort.Tensor('float32', new Float32Array(512), [1, 512]),
  state: new ort.Tensor('float32', new Float32Array(2 * 128), [2, 1, 128]),
  sr: new ort.Tensor('int64', new BigInt64Array([16000n]), []),
});
console.log(JSON.stringify({
  runtime: 'onnxruntime-web-wasm',
  model_sha256: createHash('sha256').update(data).digest('hex'),
  input_names: session.inputNames,
  output_names: session.outputNames,
  input_metadata: session.inputMetadata,
  output_metadata: session.outputMetadata,
  silence_speech_risk: output.output.data[0],
  output_dimensions: Object.fromEntries(Object.entries(output).map(([name, tensor]) => [name, tensor.dims])),
}, null, 2));
