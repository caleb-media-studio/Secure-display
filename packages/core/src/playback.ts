/**
 * Experimental CENC EME player for synthetic DRM test streams only.
 * This does not protect real reports or verify screenshot exclusion.
 * FairPlay requires a separate provider-specific HLS adapter.
 */
export type LicenseHandler =
  (challenge: Uint8Array, messageType: MediaKeyMessageType) => Promise<ArrayBuffer>;

export interface SyntheticPlaybackConfig {
  classification: "synthetic-test-only";
  encryptedMediaUrl: string;
  keySystem: string;
  contentType: string;
  robustness?: string;
  requestLicense: LicenseHandler;
  serverCertificate?: ArrayBuffer;
  onStatus?: (status: "initializing" | "license-usable" | "blocked", detail?: string) => void;
}
export interface PlaybackHandle { destroy(): Promise<void> }

export function assertMediaUrl(input: string, base: string): URL {
  const url = new URL(input, base);
  if (url.protocol !== "https:" &&
      !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) {
    throw new Error("Media URL must be HTTPS except for localhost development.");
  }
  if (url.username || url.password) throw new Error("Do not put credentials in media URLs.");
  return url;
}

export async function startSyntheticPlayback(
  video: HTMLVideoElement, config: SyntheticPlaybackConfig,
): Promise<PlaybackHandle> {
  if (config.classification !== "synthetic-test-only") throw Error("Only synthetic media is supported.");
  video.hidden = true;
  video.controls = false;
  video.disablePictureInPicture = true;
  video.disableRemotePlayback = true;
  video.preload = "none";
  if (typeof location === "undefined" || !globalThis.isSecureContext ||
      typeof navigator.requestMediaKeySystemAccess !== "function") {
    throw Error("HTTPS-compatible browser EME is required.");
  }
  const mediaUrl = assertMediaUrl(config.encryptedMediaUrl, location.href);
  if (config.keySystem.startsWith("com.apple.fps")) {
    throw Error("FairPlay needs a dedicated HLS license adapter; CENC lab player blocked.");
  }

  config.onStatus?.("initializing");
  const access = await navigator.requestMediaKeySystemAccess(config.keySystem, [{
    initDataTypes: ["cenc"], sessionTypes: ["temporary"],
    videoCapabilities: [{
      contentType: config.contentType,
      ...(config.robustness ? {robustness: config.robustness} : {}),
    }],
  }]);
  const keys = await access.createMediaKeys();
  if (config.serverCertificate) {
    if (!(await keys.setServerCertificate(config.serverCertificate))) {
      throw Error("Server certificate rejected by the CDM.");
    }
  }
  await video.setMediaKeys(keys);
  let destroyed = false;
  let blocked = false;
  const sessions = new Set<MediaKeySession>();
  const reject = (reason: string) => {
    blocked = true;
    video.hidden = true;
    video.pause();
    config.onStatus?.("blocked", reason);
  };
  const onEncrypted = (event: MediaEncryptedEvent) => {
    if (destroyed || blocked || !event.initData) return;
    let session: MediaKeySession;
    try { session = keys.createSession("temporary"); }
    catch { reject("Could not create DRM session."); return; }
    sessions.add(session);
    session.addEventListener("keystatuseschange", () => {
      if (destroyed || blocked) return;
      const statuses: MediaKeyStatus[] = [];
      session.keyStatuses.forEach(status => statuses.push(status));
      if (statuses.length && statuses.every(status => status === "usable")) {
        // Usable keys are NOT proof of protected screenshot output.
        config.onStatus?.("license-usable");
        video.hidden = false;
      } else reject("Keys are unusable, expired, or restricted by output policy.");
    });
    session.addEventListener("message", event => {
      if (destroyed || blocked) return;
      void (async () => {
        const challenge = new Uint8Array(event.message.slice(0));
        const license = await config.requestLicense(challenge, event.messageType);
        if (!destroyed && !blocked) await session.update(license);
      })().catch(() => reject("License exchange failed."));
    });
    void session.generateRequest(event.initDataType, event.initData)
      .catch(() => reject("DRM key request failed."));
  };
  const onError = () => reject("Encrypted media playback failed.");
  video.addEventListener("encrypted", onEncrypted);
  video.addEventListener("error", onError);
  video.src = mediaUrl.href;
  video.load();
  return {
    async destroy() {
      destroyed = true;
      video.hidden = true;
      video.pause();
      video.removeEventListener("encrypted", onEncrypted);
      video.removeEventListener("error", onError);
      video.removeAttribute("src");
      video.load();
      await Promise.allSettled([...sessions].map(session => session.close()));
      sessions.clear();
      await video.setMediaKeys(null).catch(() => undefined);
    },
  };
}
