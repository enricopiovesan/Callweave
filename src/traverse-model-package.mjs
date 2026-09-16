const required = (value, name) => {
  if (value === undefined || value === null || value === '') throw new Error(`${name} is required`);
  return value;
};

const digest = (value, name) => {
  required(value, name);
  if (!/^[0-9a-f]{64}$/i.test(value)) throw new Error(`${name} must be a 64-character sha256 hex digest`);
  return value.toLowerCase();
};

export function validateTraverseModelPackageManifest({ manifest }) {
  required(manifest, 'manifest');
  for (const field of ['model_id', 'version', 'executable_format', 'registry_ref', 'license_id', 'attribution']) required(manifest[field], `manifest.${field}`);
  digest(manifest.wasm_digest, 'manifest.wasm_digest');
  digest(manifest.package_digest, 'manifest.package_digest');
  if (!Number.isInteger(manifest.abi_version) || manifest.abi_version < 1) throw new Error('manifest.abi_version must be a positive integer');
  if (!Array.isArray(manifest.supported_profiles) || !manifest.supported_profiles.includes('wasm-cpu')) throw new Error('manifest.supported_profiles must include wasm-cpu');
  for (const field of ['input_schema_ref', 'input_schema_version', 'output_schema_ref', 'output_schema_version']) required(manifest[field], `manifest.${field}`);
  for (const field of ['max_memory_bytes', 'max_fuel', 'max_input_bytes', 'max_output_bytes', 'max_execution_ms']) {
    if (!Number.isInteger(manifest[field]) || manifest[field] <= 0) throw new Error(`manifest.${field} must be positive`);
  }
  if (typeof manifest.offline_allowed !== 'boolean') throw new Error('manifest.offline_allowed must be boolean');
  return {
    valid: true,
    model_id: manifest.model_id,
    version: manifest.version,
    wasm_digest: manifest.wasm_digest.toLowerCase(),
    package_digest: manifest.package_digest.toLowerCase(),
    abi_version: manifest.abi_version,
    supported_profiles: [...manifest.supported_profiles].sort(),
    offline_allowed: manifest.offline_allowed,
    license_id: manifest.license_id,
  };
}
