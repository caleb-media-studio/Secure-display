import { currentEmeEnvironment, type EmeEnvironment } from "./capabilities.js";

/**
 * Diagnostic-only EME probe. Intentionally never contributes to disclosure
 * policy; software Widevine does NOT offer hardware output protection.
 */
export interface SoftwareDrmBaseline {
  kind: "widevine-software-baseline";
  status: "candidate" | "unsupported" | "unavailable";
  /** Browser rejection name only; no identifying data, tokens or messages. */
  rejectionName?: string;
  captureExclusionVerified: false;
  note: string;
}

export async function probeSoftwareWidevineBaseline(
  environment: EmeEnvironment = currentEmeEnvironment(),
): Promise<SoftwareDrmBaseline> {
  const base = {
    kind: "widevine-software-baseline",
    captureExclusionVerified: false,
  } as const;
  if (!environment.secureContext || !environment.requestAccess) return {
    ...base,
    status: "unavailable",
    note: "EME is unavailable or the browser is not in a secure context.",
  };
  try {
    await environment.requestAccess("com.widevine.alpha", [{
      initDataTypes: ["cenc"],
      sessionTypes: ["temporary"],
      videoCapabilities: [{
        contentType: 'video/mp4; codecs="avc1.42E01E"',
        robustness: "SW_SECURE_CRYPTO",
      }],
    }]);
    return {
      ...base,
      status: "candidate",
      note: "Software Widevine accepted. This is not hardware-secure DRM and cannot authorize Secure Display.",
    };
  } catch (error) {
    const safeName = error instanceof DOMException ? error.name :
      error instanceof Error ? error.name : "UnknownError";
    return {
      ...base,
      status: "unsupported",
      rejectionName: /^[A-Za-z]{1,40}Error$/.test(safeName) ? safeName : "UnknownError",
      note: "Software Widevine rejected this configuration. DRM availability may vary by codec and browser.",
    };
  }
}
