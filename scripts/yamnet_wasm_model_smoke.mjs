import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  ExactModelBrowserHost,
  encodeGuestFrame,
  modelSigningKeyId,
} from 'traverse-embedder-web';

const root = resolve(new URL('..', import.meta.url).pathname);
const packageRoot = resolve(root, 'artifacts/model-candidates/yamnet-onnx-v1/traverse-package-v3');
const manifestBytes = await readFile(resolve(packageRoot, 'model.manifest.json'));
const wasmBytes = await readFile(resolve(packageRoot, 'model.wasm'));
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const digest = `sha256:${createHash('sha256').update(manifestBytes).digest('hex')}`;

// This smoke test deliberately creates an ephemeral signer. No private key is
// persisted; production uses the Callweave signing key outside the repository.
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const publicJwk = publicKey.export({ format: 'jwk' });
const publicKeyBytes = Buffer.from(publicJwk.x, 'base64url');
const publicKeyHex = publicKeyBytes.toString('hex');
const keyId = await modelSigningKeyId(publicKeyBytes);
const signatureBytes = sign(null, manifestBytes, privateKey);
const signatureBytesJson = JSON.stringify({
  alg: 'ed25519',
  key_id: keyId,
  signature: signatureBytes.toString('hex'),
});

const pin = {
  model_id: manifest.model_id,
  version: manifest.version,
  digest,
  offline_allowed: manifest.offline_allowed,
  target: 'wasm-cpu',
  rights: {
    license_id: manifest.rights.license_id,
    commercial_use: manifest.rights.commercial_use,
  },
  key_id: keyId,
};

const host = new ExactModelBrowserHost([pin], {
  trustedPublicKeysHex: [publicKeyHex],
  modelUsage: 'commercial',
});
const policy = {
  policy_ref: 'policy:callweave-yamnet-wasm-cpu',
  placements: ['wasm-cpu'],
  require_fuel_metering: true,
};
const placement = await host.registerPackage(
  manifestBytes,
  wasmBytes,
  new TextEncoder().encode(signatureBytesJson),
  policy,
);

const waveform = new Float32Array(160_000);
for (let index = 0; index < waveform.length; index += 1) {
  waveform[index] = Math.sin((index / 16_000) * Math.PI * 2 * 440) * 0.05;
}
const waveformBytes = new Uint8Array(waveform.buffer);
const inputFrame = encodeGuestFrame(2, [160_000], waveformBytes);
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
const output = host.io.readModelOutput(execution.output_ref, manifest.max_output_bytes);

console.log(JSON.stringify({
  status: 'passed',
  model_id: manifest.model_id,
  model_version: manifest.version,
  model_digest: digest,
  license_id: manifest.rights.license_id,
  commercial_use: manifest.rights.commercial_use,
  placement,
  input_bytes: inputFrame.byteLength,
  output_bytes: output.byteLength,
  output_schema_ref: execution.output_schema_ref,
  trace: execution.trace,
}, null, 2));
