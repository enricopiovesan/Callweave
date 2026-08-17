import { writeFile } from 'node:fs/promises';

const [outputPath] = process.argv.slice(2);
if (!outputPath) throw new Error('Usage: node scripts/generate-silence-fixture.mjs <output.wav>');
const sampleRate = 48000;
const samples = sampleRate * 5;
const dataBytes = samples * 2;
const wav = Buffer.alloc(44 + dataBytes);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + dataBytes, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(dataBytes, 40);
await writeFile(outputPath, wav);
