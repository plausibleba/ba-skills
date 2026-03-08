/**
 * Convert a scaffold element ID to a human-readable display name.
 *
 * Strips known type prefixes (cap_, role_, act_, vs_, metric_, outcome_, etc.)
 * then converts snake_case or kebab-case remainder to Title Case.
 *
 * Examples:
 *   cap_lead_qualification       → "Lead Qualification"
 *   role_credit_analyst          → "Credit Analyst"
 *   cap-channel-partner-sales-territory-assignment-decision-authority
 *                                → "Channel Partner Sales Territory Assignment Decision Authority"
 */

const PREFIX_RE = /^(cap|role|act|vs|outcome|metric|measure|control|constraint|directive|deontic|flow|concept|prop|tech|info|appfn|rc)[_-]/;

export function humanizeId(id: string): string {
  // Strip type prefix
  const stripped = id.replace(PREFIX_RE, "");
  // Replace separators with spaces, then title-case each word
  return stripped
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
