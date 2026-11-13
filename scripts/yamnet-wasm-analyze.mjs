import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { runYamnetWasm } from '../src/yamnet-wasm-model.mjs';

const [inputPath, outputPath = 'output/yamnet-wasm.json'] = process.argv.slice(2);
if (!inputPath) {
  console.error('Usage: npm run yamnet:wasm:analyze -- <audio-file> [output-json]');
  process.exit(2);
}
const decoded = spawnSync(ffmpegPath, ['-v', 'error', '-i', resolve(inputPath), '-t', '10', '-ac', '1', '-ar', '16000', '-f', 'f32le', 'pipe:1'], { encoding: null, maxBuffer: 2 * 1024 * 1024 });
if (decoded.status !== 0) throw new Error(decoded.error?.message || decoded.stderr?.toString() || 'ffmpeg decode failed');
const waveform = new Float32Array(decoded.stdout.buffer, decoded.stdout.byteOffset, Math.floor(decoded.stdout.byteLength / 4));
const frame = new Float32Array(160000);
frame.set(waveform.subarray(0, Math.min(waveform.length, frame.length)));
const result = await runYamnetWasm(frame);
const output = resolve(outputPath);
await import('node:fs/promises').then(fs => fs.mkdir(resolve(output, '..'), { recursive: true }).then(() => fs.writeFile(output, `${JSON.stringify(result, null, 2)}\n`)));
console.log(JSON.stringify({ status: 'passed', output, samples: waveform.length, top_scores: result.top_scores.slice(0, 10) }, null, 2));
