import type {SecureDivPlaybackAdapter} from "@secure-display/secure-div";

/** Built-time encrypted asset binding returned by the integrator. */
export interface ProtectedAssetBinding {
  assetId: string;
  sourceSha256: string;
  domSha256: string;
  rootClassName: string;
}
export interface SecureDisplayConfiguration {
  /** Only a server/build-provided signed or trusted asset descriptor. */
  resolveAsset: (element: HTMLElement, signal: AbortSignal) => Promise<ProtectedAssetBinding>;
  /** App-wide licensed DRM video loader. Must verify the asset/hash pair. */
  playbackAdapter: SecureDivPlaybackAdapter;
}
let configuration: SecureDisplayConfiguration | undefined;

/** Configure the DRM backend once at application bootstrap, not per component. */
export function configureSecureDisplay(options: SecureDisplayConfiguration): void {
  if (!options || typeof options.resolveAsset !== "function" ||
      typeof options.playbackAdapter !== "function")
    throw new TypeError("Secure Display requires asset resolution and licensed DRM playback.");
  if (configuration && (
    configuration.resolveAsset !== options.resolveAsset ||
    configuration.playbackAdapter !== options.playbackAdapter))
    throw new Error("Secure Display configuration cannot be replaced after startup.");
  configuration = options;
}
export function getSecureDisplayConfiguration(): SecureDisplayConfiguration | undefined {
  return configuration;
}
