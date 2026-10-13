/**
 * Stable DOM structure fingerprint for a pre-rendered static asset.
 * Ignores formatting-only whitespace between elements, never strips actual
 * text, attributes or element nesting. NOT a cryptographic CSS/style check.
 */
export function serializeProtectedChildren(host) {
  function walk(node) {
    if (node.nodeType === 3) {
      const normalized = node.textContent.replace(/\\s+/g, " ").trim();
      return normalized ? ["text", normalized] : null;
    }
    if (node.nodeType !== 1) return null;
    const attrs = Array.from(node.attributes, attribute => [
      attribute.name.toLowerCase(), attribute.value
    ]).sort((a, b) => a[0].localeCompare(b[0]));
    return ["element", node.localName, attrs,
      Array.from(node.childNodes, walk).filter(Boolean)];
  }
  return JSON.stringify(Array.from(host.childNodes, walk).filter(Boolean));
}
export async function hashProtectedChildren(host) {
  const bytes = new TextEncoder().encode(serializeProtectedChildren(host));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,"0")).join("");
}
