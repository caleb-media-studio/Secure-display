/**
 * Publicly documented DRM interoperability test vectors.
 * No provider credentials, signed entitlements or content keys are bundled.
 * Never use these test licenses or media with sensitive application data.
 */
export const PUBLIC_TOKEN_SOURCE =
  "https://raw.githubusercontent.com/Axinom/public-test-vectors/master/ContentKeys/Axinom-Encoding-Cmaf-H264-protected-SingleKey.txt";

export const TEST_STREAMS = Object.freeze({
  pbs: {
    label: "PBS synthetic test pattern (H.264 CBCS)",
    manifest: "https://pbs.github.io/test-streams/pbs/test-pattern-drm/pbs-bars_avc.m3u8",
  },
  axinom: {
    label: "Axinom publicly documented H.264 test stream",
    manifest: "https://media.axprod.net/TestVectors/Cmaf/protected_1080p_h264_cbcs/manifest.m3u8",
  },
});
export const DRM_ENDPOINTS = Object.freeze({
  fairplay: {
    keySystem: "com.apple.fps",
    license: "https://drm-fairplay-licensing.axprod.net/AcquireLicense",
    certificate: "https://tools.axinom.com/FPScert/fairplay.cer",
  },
  widevine: {
    keySystem: "com.widevine.alpha",
    license: "https://drm-widevine-licensing.axprod.net/AcquireLicense",
  },
});

/** Extract a public demonstration entitlement from Axinom's own published text. */
export function extractPublishedEntitlement(text) {
  if (typeof text !== "string") return null;
  const match = text.match(/X-AxDRM-Message header:\s*([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/i);
  return match?.[1] ?? null;
}
/** Do not log HTTP request URIs, entitlement headers or DRM challenge bodies. */
export function safePlaybackError(error) {
  const code = Number.isInteger(error?.code) ? error.code : null;
  const category = Number.isInteger(error?.category) ? error.category : null;
  const statuses = Array.isArray(error?.data)
    ? error.data.filter(value => Number.isInteger(value) && value >= 400 && value <= 599)
    : [];
  return {category,code,httpStatus:statuses[0] ?? null};
}
export function selectDefaultDrm(userAgent = "") {
  const safari = /Safari/i.test(userAgent) && !/(Chrome|Chromium|CriOS|Edg|OPR|FxiOS)/i.test(userAgent);
  return safari ? "fairplay" : "widevine";
}
