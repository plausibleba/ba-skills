/**
 * scaffold-hash.ts — D-118: Deterministic scaffold content hashing.
 *
 * Produces a stable hash from scaffold structural content so that
 * diagnostic artefacts can detect when the scaffold they were derived
 * from has changed (staleness detection).
 *
 * Uses a fast 53-bit hash (cyrb53) on the JSON-serialised scaffold elements.
 * This is NOT cryptographic — it's a content-change detector, not a
 * security mechanism.
 */

/**
 * cyrb53 — fast, high-quality 53-bit hash.
 * Source: https://github.com/bryc/code (public domain).
 */
function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/**
 * Compute a deterministic content hash from scaffold structural data.
 *
 * Hashes the `elements` object (which contains all structural content:
 * value streams, activities, capabilities, roles, IOs, tech, metrics,
 * subActivityGraphs, etc.). Excludes non-structural metadata like
 * scaffoldId, name, description, schemaVersion.
 *
 * Two scaffolds with identical elements will produce the same hash,
 * regardless of when they were loaded or what their scaffoldId is.
 */
export function computeScaffoldHash(scaffold: any): string {
  if (!scaffold?.elements) return "empty";
  // Sort keys for deterministic serialisation
  const serialised = JSON.stringify(scaffold.elements, Object.keys(scaffold.elements).sort());
  return `sh_${cyrb53(serialised)}`;
}
