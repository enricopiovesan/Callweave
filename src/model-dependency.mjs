const COMMERCIAL_USE = new Set(['allowed', 'restricted', 'prohibited']);
const REQUIRED_KEYS = ['model_id', 'version', 'digest', 'offline_allowed', 'target', 'rights'];
const RIGHTS_KEYS = ['license_id', 'commercial_use'];

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, keys, path) {
  if (!isRecord(value)) throw new Error(`${path} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${path} contains unknown or missing fields`);
  }
}

function requiredString(value, path) {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${path} must be a non-empty string`);
  return value.trim();
}

function normalizeDigest(value) {
  const digest = requiredString(value, 'digest').toLowerCase();
  if (!/^sha256:[0-9a-f]{64}$/.test(digest) && !/^[0-9a-f]{64}$/.test(digest)) {
    throw new Error('digest must be a SHA-256 hex digest');
  }
  return digest.startsWith('sha256:') ? digest : `sha256:${digest}`;
}

/** Validate an application-scoped Spec 044/138 exact model pin. */
export function validateModelDependency(pin) {
  exactKeys(pin, REQUIRED_KEYS.concat(Object.hasOwn(pin ?? {}, 'key_id') ? ['key_id'] : []), 'model dependency');
  const normalized = {
    model_id: requiredString(pin.model_id, 'model_id'),
    version: requiredString(pin.version, 'version'),
    digest: normalizeDigest(pin.digest),
    offline_allowed: pin.offline_allowed,
    target: pin.target,
    rights: pin.rights,
  };
  if (typeof pin.offline_allowed !== 'boolean') throw new Error('offline_allowed must be boolean');
  if (pin.target !== 'wasm-cpu') throw new Error('target must be wasm-cpu');
  exactKeys(pin.rights, RIGHTS_KEYS, 'rights');
  normalized.rights = {
    license_id: requiredString(pin.rights.license_id, 'rights.license_id'),
    commercial_use: pin.rights.commercial_use,
  };
  if (!COMMERCIAL_USE.has(pin.rights.commercial_use)) throw new Error('rights.commercial_use is invalid');
  if (Object.hasOwn(pin, 'key_id')) {
    const keyId = requiredString(pin.key_id, 'key_id');
    if (!/^ed25519:[0-9a-f]{64}$/.test(keyId)) throw new Error('key_id must be an Ed25519 key identifier');
    normalized.key_id = keyId;
  }
  return Object.freeze(normalized);
}

/** Validate all pins from an application manifest and reject duplicate identities. */
export function validateModelDependencies(dependencies) {
  if (!Array.isArray(dependencies)) throw new Error('model_dependencies must be an array');
  const pins = dependencies.map(validateModelDependency);
  const identities = new Set();
  for (const pin of pins) {
    const identity = `${pin.model_id}@${pin.version}`;
    if (identities.has(identity)) throw new Error(`duplicate model dependency: ${identity}`);
    identities.add(identity);
  }
  return Object.freeze(pins);
}

export function modelRightsDisclosure(pin) {
  const validated = validateModelDependency(pin);
  return {
    model_id: validated.model_id,
    version: validated.version,
    license_id: validated.rights.license_id,
    commercial_use: validated.rights.commercial_use,
    offline_allowed: validated.offline_allowed,
    target: validated.target,
    activation_status: 'requires_traverse_signature_and_digest_verification',
  };
}
