import { DRM_CANDIDATES, assertMediaUrl } from "@secure-display/core";

export interface SyntheticDrmAsset {
  /** This alpha is deliberately incapable of displaying real reports. */
  classification: "synthetic-test-only";
  /** Server-produced text/video, encrypted with a licensed DRM packager. */
  encryptedMediaUrl: string;
  /** PlayReady or hardware-robustness Widevine. FairPlay requires a separate adapter. */
  keySystem: string;
  contentType: string;
  robustness?: string;
  serverCertificate?: ArrayBuffer;
  /** Default video dimensions, not the protected video pixel contents. */
  aspectRatio?: number;
}

export function validateSyntheticDrmAsset(asset: SyntheticDrmAsset, baseUrl: string): void {
  if (asset.classification !== "synthetic-test-only") {
    throw new Error("Confidential assets are blocked; only synthetic tests are supported.");
  }
  const candidate = DRM_CANDIDATES.find(candidate =>
    candidate.keySystem === asset.keySystem && candidate.contentType === asset.contentType &&
    candidate.robustness === asset.robustness && candidate.kind !== "fairplay"
  );
  if (!candidate) {
    throw new Error("DRM configuration is unsupported by this experimental CENC adapter.");
  }
  assertMediaUrl(asset.encryptedMediaUrl, baseUrl);
  if (asset.aspectRatio !== undefined && (!Number.isFinite(asset.aspectRatio) ||
      asset.aspectRatio <= 0 || asset.aspectRatio > 16)) {
    throw new Error("Invalid video aspect ratio.");
  }
}
