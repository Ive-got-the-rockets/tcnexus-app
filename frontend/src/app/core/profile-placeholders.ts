const PROFILE_PLACEHOLDER_COUNT = 25;

export const PROFILE_PLACEHOLDER_URLS = Array.from(
  { length: PROFILE_PLACEHOLDER_COUNT },
  (_, index) => `/profile-placeholders/tc-logo-${String(index + 1).padStart(2, '0')}.png`,
);

function stableHash(value: number | string): number {
  const text = String(value);
  let hash = 2166136261;
  for (const character of text) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Returns a stable, pseudo-random placeholder for a person identifier. */
export function profilePlaceholderUrl(id: number | string): string {
  return PROFILE_PLACEHOLDER_URLS[stableHash(id) % PROFILE_PLACEHOLDER_URLS.length];
}
