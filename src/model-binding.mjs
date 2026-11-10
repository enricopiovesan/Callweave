import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const HEX_SHA256 = /^[0-9a-f]{64}$/i;
const KEY_ID = /^ed25519:[0-9a-f]{64}$/;
const COMMERCIAL_USE = new Set(['allowed', 'restricted', 'prohibited']);

function record(value, path) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path} must be an object`);
  return value;
}

function text(value, path) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${path} must be a non-empty string`);
  return value.trim();
}

function digest(value, path) {
  const normalized = text(value, path).replace(/^sha256:/i, '').toLowerCase();
  if (!HEX_SHA256.test(normalized)) throw new Error(`${path} must be a SHA-256 hex digest`);
  return `sha256:${normalized}`;
}

function rights(value) {
  const source = record(value, 'rights');
  const result = {
    license_id: text(source.license_id, 'rights.license_id'),
    commercial_use: source.commercial_use,
  };
  if (!COMMERCIAL_USE.has(result.commercial_use)) throw new Error('rights.commercial_use is invalid');
  return Object.freeze(result);
}

/**
 * Validate an application-owned binding descriptor without activating a model.
 * The descriptor deliberately permits an absent public key: that is the safe
 * release-time state before the deployment secret is provisioned. Activation
 * must call `requireTrustedActivation` and therefore cannot silently fall back.
 */
export function validateModelBinding(binding) {
  const source = record(binding, 'model binding');
  const dependency = record(source.model_dependency, 'model_dependency');
  const packageInfo = record(source.package, 'package');
  const trust = record(source.trust, 'trust');
  const model = {
    model_id: text(dependency.model_id, 'model_dependency.model_id'),
    version: text(dependency.version, 'model_dependency.version'),
    manifest_digest: digest(dependency.manifest_digest, 'model_dependency.manifest_digest'),
    wasm_digest: digest(dependency.wasm_digest, 'model_dependency.wasm_digest'),
    target: dependency.target,
    offline_allowed: dependency.offline_allowed,
    rights: rights(dependency.rights),
  };
  if (model.target !== 'wasm-cpu') throw new Error('model_dependency.target must be wasm-cpu');
  if (typeof model.offline_allowed !== 'boolean') throw new Error('model_dependency.offline_allowed must be boolean');
  const packageResult = {
    manifest_path: text(packageInfo.manifest_path, 'package.manifest_path'),
    wasm_path: text(packageInfo.wasm_path, 'package.wasm_path'),
    signature_path: text(packageInfo.signature_path, 'package.signature_path'),
  };
  const publicKeyHex = trust.public_key_hex == null ? null : text(trust.public_key_hex, 'trust.public_key_hex').toLowerCase();
  if (publicKeyHex !== null && !/^[0-9a-f]{64}$/.test(publicKeyHex)) throw new Error('trust.public_key_hex must be 32-byte hex');
  const keyId = trust.key_id == null ? null : text(trust.key_id, 'trust.key_id');
  if (keyId !== null && !KEY_ID.test(keyId)) throw new Error('trust.key_id must be an Ed25519 key identifier');
  return Object.freeze({
    schema_version: text(source.schema_version, 'schema_version'),
    binding_id: text(source.binding_id, 'binding_id'),
    model_dependency: Object.freeze(model),
    package: Object.freeze(packageResult),
    trust: Object.freeze({ public_key_hex: publicKeyHex, key_id: keyId, source: text(trust.source, 'trust.source') }),
    activation: source.activation === 'ready' && publicKeyHex !== null ? 'ready' : 'pending_trusted_signer',
  });
}

export function requireTrustedActivation(binding) {
  const validated = validateModelBinding(binding);
  if (validated.activation !== 'ready') {
    throw new Error(`model binding ${validated.binding_id} is not activatable: trusted public key is not provisioned`);
  }
  return validated;
}

export async function verifyModelBindingFiles(binding, rootUrl) {
  const validated = validateModelBinding(binding);
  const root = rootUrl instanceof URL ? rootUrl : new URL(rootUrl);
  const manifestBytes = await readFile(new URL(validated.package.manifest_path, root));
  const wasmBytes = await readFile(new URL(validated.package.wasm_path, root));
  const manifestDigest = `sha256:${createHash('sha256').update(manifestBytes).digest('hex')}`;
  const wasmDigest = `sha256:${createHash('sha256').update(wasmBytes).digest('hex')}`;
  if (manifestDigest !== validated.model_dependency.manifest_digest) throw new Error('model manifest digest does not match binding');
  if (wasmDigest !== validated.model_dependency.wasm_digest) throw new Error('model WASM digest does not match binding');
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  if (`${manifest.model_id}@${manifest.version}` !== `${validated.model_dependency.model_id}@${validated.model_dependency.version}`) {
    throw new Error('model identity does not match binding');
  }
  return Object.freeze({ binding: validated, manifest, manifest_bytes: manifestBytes.length, wasm_bytes: wasmBytes.length });
}
