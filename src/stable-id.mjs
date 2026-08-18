function fnv1a64(text) {
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= BigInt(text.charCodeAt(i));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
}

export function stableDigest(value) {
  return fnv1a64(JSON.stringify(value));
}

export function stableId(kind, value) {
  return `${kind}-${stableDigest(value).slice(0, 16)}`;
}
