import {
  DRM_CANDIDATES,
  assertMediaUrl,
  validateFairPlayConfiguration,
  type SyntheticFairPlayConfig,
} from "@caleb-media-studio-llc/core";

export interface SyntheticCencDrmAsset {
  classification: "synthetic-test-only";
  /** Synthetic encoded video encrypted by licensed CENC packaging. */
  encryptedMediaUrl: string;
  /** Current CENC adapters support only hardware PlayReady/Widevine candidates. */
  keySystem: string;
  contentType: string;
  robustness?: string;
  serverCertificate?: ArrayBuffer;
  aspectRatio?: number;
  format?: "cenc";
}

/** Safari FairPlay HLS uses a DIFFERENT media/license pipeline from CENC MP4. */
export type SyntheticDrmAsset = SyntheticCencDrmAsset | SyntheticFairPlayConfig;

export function validateSyntheticDrmAsset(asset: SyntheticDrmAsset, baseUrl: string): void {
  if (asset.classification !== "synthetic-test-only") {
    throw new Error("Confidential assets are blocked; only synthetic tests are supported.");
  }
  if (asset.format === "fairplay-hls") {
    validateFairPlayConfiguration(asset, baseUrl);
    return;
  }
  if (asset.format !== undefined && asset.format !== "cenc") {
    throw new Error("Unknown media format.");
  }
  const candidate = DRM_CANDIDATES.find(candidate =>
    candidate.keySystem === asset.keySystem &&
    candidate.contentType === asset.contentType &&
    candidate.robustness === asset.robustness &&
    candidate.kind !== "fairplay"
  );
  if (!candidate) throw new Error("Unsupported hardware CENC DRM configuration.");
  assertMediaUrl(asset.encryptedMediaUrl, baseUrl);
  if (asset.aspectRatio !== undefined &&
     (!Number.isFinite(asset.aspectRatio) || asset.aspectRatio <= 0 || asset.aspectRatio > 16)) {
    throw new Error("Invalid video aspect ratio.");
  }
}
