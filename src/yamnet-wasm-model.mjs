import { generateKeyPairSync, sign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  ExactModelBrowserHost,
  encodeGuestFrame,
  modelSigningKeyId,
} from 'traverse-embedder-web';
import { verifyModelBindingFiles } from './model-binding.mjs';

const PACKAGE_ROOT = resolve(new URL('../artifacts/model-candidates/yamnet-onnx-v1/traverse-package-v3', import.meta.url).pathname);
const BINDING_ROOT = new URL('../artifacts/model-candidates/yamnet-onnx-v1/', import.meta.url);
const BINDING_PATH = new URL('./model-binding.json', BINDING_ROOT);
const LABELS_PATH = resolve(new URL('../artifacts/model-candidates/yamnet-onnx-v1/yamnet_class_map.csv', import.meta.url).pathname);

function parseFrame(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = view.getUint16(0, true);
  const dtype = view.getUint8(2);
  const rank = view.getUint8(3);
  const dims = [];
  let offset = 4;
  for (let index = 0; index < rank; index += 1) {
    dims.push(view.getUint32(offset, true));
    offset += 4;
  }
  const payloadLength = view.getUint32(offset, true);
  offset += 4;
  return { version, dtype, dims, payload: bytes.subarray(offset, offset + payloadLength) };
}

function parseLabels(csv) {
  return csv.split(/\r?\n/).slice(1).filter(Boolean).map(line => {
    const match = line.match(/^(\d+),[^,]+,(.*)$/);
    if (!match) return null;
    return { index: Number(match[1]), label: match[2].replace(/^"|"$/g, '').replace(/""/g, '"') };
  }).filter(Boolean);
}

async function signedHost() {
  const binding = JSON.parse(await readFile(BINDING_PATH, 'utf8'));
  const verified = await verifyModelBindingFiles(binding, BINDING_ROOT);
  const manifestBytes = await readFile(resolve(PACKAGE_ROOT, 'model.manifest.json'));
  const wasmBytes = await readFile(resolve(PACKAGE_ROOT, 'model.wasm'));
  const manifest = verified.manifest;
  const digest = verified.binding.model_dependency.manifest_digest;
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicJwk = publicKey.export({ format: 'jwk' });
  const publicKeyBytes = Buffer.from(publicJwk.x, 'base64url');
  const publicKeyHex = publicKeyBytes.toString('hex');
  const keyId = await modelSigningKeyId(publicKeyBytes);
  const signature = sign(null, manifestBytes, privateKey);
  const host = new ExactModelBrowserHost([{
    model_id: verified.binding.model_dependency.model_id,
    version: verified.binding.model_dependency.version,
    digest,
    offline_allowed: manifest.offline_allowed,
    target: 'wasm-cpu',
    rights: verified.binding.model_dependency.rights,
    key_id: keyId,
  }], { trustedPublicKeysHex: [publicKeyHex], modelUsage: 'commercial' });
  const policy = { policy_ref: 'policy:callweave-yamnet-wasm-cpu', placements: ['wasm-cpu'], require_fuel_metering: true };
  await host.registerPackage(manifestBytes, wasmBytes, new TextEncoder().encode(JSON.stringify({ alg: 'ed25519', key_id: keyId, signature: signature.toString('hex') })), policy);
  return { host, manifest, digest, policy };
}

/** Run the signed YAMNet WASM package over mono 16 kHz float32 PCM. */
export async function runYamnetWasm(waveform) {
  if (!(waveform instanceof Float32Array)) throw new Error('waveform must be Float32Array');
  const { host, manifest, digest, policy } = await signedHost();
  const inputFrame = encodeGuestFrame(2, [waveform.length], new Uint8Array(waveform.buffer, waveform.byteOffset, waveform.byteLength));
  const inputRef = host.io.stageModelInput(inputFrame, manifest.max_input_bytes);
  const execution = await host.execute({
    model_ref: { model_id: manifest.model_id, version: manifest.version, digest },
    input_ref: inputRef,
    policy_ref: policy.policy_ref,
    data_classification: 'public',
    input_schema_ref: manifest.input_schema_ref,
    input_schema_version: manifest.input_schema_version,
    max_output_bytes: manifest.max_output_bytes,
    allowed_classifications: ['public'],
    timeout_ms: manifest.max_execution_ms,
  });
  const frame = parseFrame(host.io.readModelOutput(execution.output_ref, manifest.max_output_bytes));
  const scores = new Float32Array(frame.payload.buffer, frame.payload.byteOffset, frame.payload.byteLength / 4);
  const labels = parseLabels(await readFile(LABELS_PATH, 'utf8'));
  const frameWidth = labels.length;
  const averaged = labels.map(({ index, label }) => {
    let total = 0;
    let count = 0;
    for (let offset = index; offset < scores.length; offset += frameWidth) { total += scores[offset]; count += 1; }
    return { label, score: count ? total / count : 0 };
  }).sort((left, right) => right.score - left.score);
  return {
    model: { model_id: manifest.model_id, version: manifest.version, digest, rights: manifest.rights },
    execution,
    input: { samples: waveform.length, sample_rate_hz: 16000 },
    top_scores: averaged.slice(0, 20),
  };
}
