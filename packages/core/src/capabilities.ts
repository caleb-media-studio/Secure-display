/** DRM capability detection is not a screen capture protection certificate. */
export type DrmKind = "playready-sl3000" | "widevine-hardware" | "fairplay";
export type ProbeStatus = "candidate" | "unsupported" | "unavailable";

export interface DrmCandidate {
  kind: DrmKind;
  keySystem: string;
  contentType: string;
  initDataTypes: readonly string[];
  robustness?: string;
}
export interface DrmProbe extends DrmCandidate {
  status: ProbeStatus;
  explanation: string;
  /** Always false: no web EME probe attests screen capture exclusion. */
  captureExclusionVerified: false;
}
export const DRM_CANDIDATES: readonly DrmCandidate[] = Object.freeze([
  {
    kind: "playready-sl3000",
    keySystem: "com.microsoft.playready.recommendation.3000",
    contentType: 'video/mp4; codecs="avc1.42E01E"',
    initDataTypes: ["cenc"],
  },
  {
    kind: "widevine-hardware",
    keySystem: "com.widevine.alpha",
    contentType: 'video/mp4; codecs="avc1.42E01E"',
    initDataTypes: ["cenc"],
    robustness: "HW_SECURE_ALL",
  },
  {
    kind: "fairplay",
    keySystem: "com.apple.fps",
    contentType: 'video/mp4; codecs="avc1.42E01E"',
    initDataTypes: ["sinf", "cenc"],
  },
]);

export interface EmeEnvironment {
  secureContext: boolean;
  requestAccess?: (keySystem: string, config: MediaKeySystemConfiguration[]) => Promise<MediaKeySystemAccess>;
}
export function currentEmeEnvironment(): EmeEnvironment {
  if (typeof navigator === "undefined") return { secureContext: false };
  return {
    secureContext: globalThis.isSecureContext === true,
    requestAccess: typeof navigator.requestMediaKeySystemAccess === "function"
      ? (keySystem, config) => navigator.requestMediaKeySystemAccess(keySystem, config)
      : undefined,
  };
}
/** Run only after user initiation; CDM requests can prompt for permission. */
export async function probeDrmPaths(
  environment: EmeEnvironment = currentEmeEnvironment(),
  candidates: readonly DrmCandidate[] = DRM_CANDIDATES,
): Promise<DrmProbe[]> {
  if (!environment.secureContext || !environment.requestAccess) {
    return candidates.map(candidate => ({
      ...candidate, status: "unavailable", captureExclusionVerified: false,
      explanation: "EME requires a secure context and a compatible CDM.",
    }));
  }
  return Promise.all(candidates.map(async (candidate): Promise<DrmProbe> => {
    try {
      const configuration: MediaKeySystemConfiguration = {
        initDataTypes: [...candidate.initDataTypes],
        sessionTypes: ["temporary"],
        videoCapabilities: [{
          contentType: candidate.contentType,
          ...(candidate.robustness ? { robustness: candidate.robustness } : {}),
        }],
      };
      const access = await environment.requestAccess!(candidate.keySystem, [configuration]);
      return {
        ...candidate, keySystem: access.keySystem, status: "candidate",
        captureExclusionVerified: false,
        explanation: "CDM accepted the configuration. Capture exclusion remains unverified.",
      };
    } catch {
      return {
        ...candidate, status: "unsupported", captureExclusionVerified: false,
        explanation: "Browser or device rejected the requested DRM configuration.",
      };
    }
  }));
}
