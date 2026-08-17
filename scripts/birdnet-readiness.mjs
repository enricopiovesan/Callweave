import * as ort from 'onnxruntime-web';

const [modelPath] = process.argv.slice(2);
if (!modelPath) {
  console.error('Usage: npm run birdnet:readiness -- <local-model.onnx>');
  process.exit(2);
}

const started = performance.now();
const session = await ort.InferenceSession.create(modelPath, {
  executionProviders: ['wasm'],
});
const inputName = session.inputNames[0];
const input = new ort.Tensor('float32', new Float32Array(144000), [1, 144000]);
const output = await session.run({ [inputName]: input });
console.log(JSON.stringify({
  runtime: 'onnxruntime-web-wasm',
  input_name: inputName,
  output_names: Object.keys(output),
  cold_load_and_inference_ms: Math.round(performance.now() - started),
  input_samples: 144000,
  sample_rate_hz: 48000,
}, null, 2));
