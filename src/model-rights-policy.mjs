const COMMERCIAL = new Set(['allowed', 'restricted', 'prohibited', 'non-commercial-only']);
const REDISTRIBUTION = new Set(['allowed', 'allowed-with-terms', 'restricted', 'forbidden']);

function nonEmpty(value, path) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${path} is required`);
  return value.trim();
}

/** Apply the repository's conservative model-distribution policy. */
export function evaluateModelRights(manifest, { tier = 'default' } = {}) {
  if (!manifest || typeof manifest !== 'object') throw new Error('model manifest is required');
  if (!['default', 'optional-restricted'].includes(tier)) throw new Error(`unsupported policy tier: ${tier}`);
  const rights = manifest.rights ?? manifest;
  const licenseId = nonEmpty(rights.license_id ?? rights.license, 'rights.license_id');
  const redistributionRaw = nonEmpty(rights.redistribution, 'rights.redistribution');
  const commercialUse = nonEmpty(rights.commercial_use, 'rights.commercial_use');
  const redistribution = redistributionRaw.toLowerCase().startsWith('allowed')
    ? (redistributionRaw.toLowerCase() === 'allowed' ? 'allowed' : 'allowed-with-terms')
    : redistributionRaw;
  if (!COMMERCIAL.has(commercialUse)) throw new Error(`unknown commercial-use value: ${commercialUse}`);
  if (!REDISTRIBUTION.has(redistribution)) throw new Error(`unknown redistribution value: ${redistribution}`);
  const attribution = rights.attribution;
  if (attribution == null || (typeof attribution !== 'string' && !Array.isArray(attribution))) throw new Error('rights.attribution is required');
  const defaultAllowed = ['allowed', 'allowed-with-terms'].includes(redistribution) && commercialUse === 'allowed';
  const optionalAllowed = redistribution === 'allowed' || redistribution === 'allowed-with-terms';
  const approved = tier === 'default' ? defaultAllowed : optionalAllowed;
  return Object.freeze({
    approved,
    tier,
    license_id: licenseId,
    redistribution,
    commercial_use: commercialUse,
    activation: approved ? (tier === 'default' ? 'automatic-after-traverse-verification' : 'explicit-user-consent') : 'rejected',
    reason: approved ? 'rights_meet_selected_distribution_tier' : tier === 'default' ? 'default_distribution_requires_permissive_commercial_rights' : 'redistribution_terms_do_not_permit_optional_install',
  });
}
