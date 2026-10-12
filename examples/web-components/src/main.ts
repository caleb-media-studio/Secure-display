import { registerSecureElements } from "@secure-display/elements";

/**
 * Replace these placeholders only when a properly licensed synthetic test
 * stream and authenticated server-side license proxy are available.
 * Never put plaintext values, private keys or real report data into the DOM.
 */
registerSecureElements({
  async resolveAsset(_opaqueId, _signal) {
    throw new Error("No synthetic DRM test provider configured.");
  },
  async requestLicense(_opaqueId, _challenge, _type, _signal) {
    throw new Error("No authorized DRM license proxy configured.");
  },
});
