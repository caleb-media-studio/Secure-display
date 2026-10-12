import { assertMediaUrl, type PlaybackHandle } from "./playback.js";

/**
 * HLS FairPlay configuration for a synthetic, DRM-packaged research stream.
 * The license URL is an authenticated PROXY, never a vendor secret in source.
 */
export interface SyntheticFairPlayConfig {
  classification: "synthetic-test-only";
  format: "fairplay-hls";
  encryptedMediaUrl: string;
  certificateUrl: string;
  licenseProxyUrl: string;
  keySystem: "com.apple.fps";
  /** Browser codec in playlist is negotiated by Safari / Shaka. */
  aspectRatio?: number;
}

export interface ShakaLikePlayer {
  attach(video: HTMLVideoElement): Promise<void>;
  configure(configuration: unknown): void;
  load(uri: string): Promise<void>;
  /** Shaka returns the actual selected DRM, not just a requested candidate. */
  drmInfo(): { keySystem: string } | null;
  destroy(): Promise<void>;
  addEventListener(type: "error", listener: EventListener): void;
  removeEventListener(type: "error", listener: EventListener): void;
}

export type ShakaPlayerFactory = () => Promise<ShakaLikePlayer>;

export function validateFairPlayConfiguration(
  config: SyntheticFairPlayConfig, base: string,
): void {
  if (config.classification !== "synthetic-test-only" ||
      config.format !== "fairplay-hls" || config.keySystem !== "com.apple.fps") {
    throw new Error("Only synthetic modern FairPlay HLS streams are supported.");
  }
  const mediaUrl = assertMediaUrl(config.encryptedMediaUrl, base);
  assertMediaUrl(config.certificateUrl, base);
  assertMediaUrl(config.licenseProxyUrl, base);
  if (!mediaUrl.pathname.toLowerCase().endsWith(".m3u8")) {
    throw new Error("FairPlay playback requires an HLS playlist.");
  }
  if (config.aspectRatio !== undefined &&
      (!Number.isFinite(config.aspectRatio) || config.aspectRatio <= 0 ||
       config.aspectRatio > 16)) {
    throw new Error("Invalid protected media aspect ratio.");
  }
}

/**
 * Experimental modern FairPlay HLS integration. Does not claim capture
 * exclusion. A Shaka Player instance is injected to keep core dependency-free.
 * Content is shown ONLY for explicitly synthetic experiments and only when
 * Shaka reports actual FairPlay DRM selection after loading the media.
 *
 * Actual playback requires a real encrypted HLS asset, FairPlay application
 * certificate and authenticated provider license proxy. No credentials are
 * embedded in the library.
 */
export async function startSyntheticFairPlayPlayback(
  video: HTMLVideoElement,
  config: SyntheticFairPlayConfig,
  createPlayer: ShakaPlayerFactory,
  onStatus?: (status: "initializing" | "synthetic-playback-available" | "blocked") => void,
  secureContext: boolean = globalThis.isSecureContext === true,
): Promise<PlaybackHandle> {
  video.hidden = true;
  video.controls = false;
  video.disablePictureInPicture = true;
  video.disableRemotePlayback = true;
  if (!secureContext || typeof location === "undefined") {
    throw Error("FairPlay requires an HTTPS-compatible browser.");
  }
  validateFairPlayConfiguration(config, location.href);
  onStatus?.("initializing");
  let player: ShakaLikePlayer | undefined;
  let destroyed = false;
  let blocked = false;
  const fail = () => {
    if (destroyed) return;
    blocked = true;
    video.hidden = true;
    video.pause();
    onStatus?.("blocked");
  };
  const onError: EventListener = () => { fail(); };
  try {
    player = await createPlayer();
    if (!player) throw Error("FairPlay player unavailable.");
    player.addEventListener("error", onError);
    await player.attach(video);
    if (blocked) throw Error("Player failed to attach.");
    player.configure({
      drm: {
        servers: { "com.apple.fps": assertMediaUrl(config.licenseProxyUrl, location.href).href },
        advanced: {
          "com.apple.fps": {
            serverCertificateUri: assertMediaUrl(config.certificateUrl, location.href).href,
          },
        },
      },
      streaming: {
        useNativeHlsForFairPlay: true,
      },
    });
    await player.load(assertMediaUrl(config.encryptedMediaUrl, location.href).href);
    if (blocked || destroyed) throw Error("FairPlay playback interrupted.");
    if (player.drmInfo()?.keySystem !== "com.apple.fps") {
      throw Error("Expected a real FairPlay DRM session, not clear HLS.");
    }
    // This is strictly a synthetic experiment; DRM does not attest capture exclusion.
    video.hidden = false;
    onStatus?.("synthetic-playback-available");
    return {
      async destroy() {
        if (destroyed) return;
        destroyed = true;
        video.hidden = true;
        video.pause();
        player?.removeEventListener("error", onError);
        await player?.destroy();
      },
    };
  } catch {
    fail();
    player?.removeEventListener("error", onError);
    await player?.destroy().catch(() => undefined);
    throw Error("Synthetic FairPlay HLS playback failed or was rejected.");
  }
}
