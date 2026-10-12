import { startSyntheticPlayback, type PlaybackHandle } from "@secure-display/core";
import { validateSyntheticDrmAsset, type SyntheticDrmAsset } from "./assets.js";
import { SecureDisplaySetupError } from "./errors.js";

export type SecureTag = "secure-text" | "secure-p" | "secure-h1";

export interface SecureElementAdapters {
  /** Only opaque, non-identifying asset IDs should be used in HTML attributes. */
  resolveAsset: (assetId: string, signal: AbortSignal) => Promise<SyntheticDrmAsset>;
  /** Application forwards DRM challenges to its authenticated server-side license proxy. */
  requestLicense: (
    assetId: string,
    challenge: Uint8Array,
    messageType: MediaKeyMessageType,
    signal: AbortSignal,
  ) => Promise<ArrayBuffer>;
}

export const SECURE_ELEMENT_TAGS: readonly SecureTag[] = ["secure-text", "secure-p", "secure-h1"];

/**
 * Registers native custom elements. Does NOT draw text on a canvas or decrypt
 * content in JavaScript. The browser CDM decrypts licensed encoded media.
 * Currently ONLY supports synthetic research media, never sensitive reports.
 */
export function registerSecureElements(adapters: SecureElementAdapters): void {
  if (typeof window === "undefined" || typeof customElements === "undefined") {
    throw new Error("Secure custom elements require a browser environment.");
  }
  if (SECURE_ELEMENT_TAGS.some(tag => customElements.get(tag))) {
    throw new Error("Secure Display custom elements were already registered.");
  }
  if (typeof adapters.resolveAsset !== "function" || typeof adapters.requestLicense !== "function") {
    throw new TypeError("DRM asset and license adapters are required.");
  }

  function createElementClass(tag: SecureTag) {
    return class SecureDrmElement extends HTMLElement {
      static get observedAttributes() { return ["asset-id"]; }
      private controller: AbortController | undefined;
      private playback: PlaybackHandle | undefined;
      private generation = 0;
      private video: HTMLVideoElement;
      private status: HTMLElement;

      constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = `
          :host { display: inline-block; max-width: 100%; min-width: 1ch; vertical-align: baseline; }
          :host([hidden]) { display: none !important; }
          :host([data-state="blocked"]) { opacity: 0.85; }
          :host(secure-p) { display: block; margin-block: 1em; }
          :host(secure-h1) { display: block; margin-block: .67em; }
          video { display: block; width: 100%; max-width: 100%; height: auto; }
          video[hidden] { display: none !important; }
          .status { color: inherit; border: 1px dashed currentColor; border-radius: .3em; padding: .2em .5em; }
          .status[hidden] { display: none !important; }
        `;
        this.video = document.createElement("video");
        this.video.setAttribute("playsinline", "");
        this.video.muted = true;
        this.video.autoplay = true;
        this.video.loop = true;
        this.video.controls = false;
        this.video.hidden = true;
        this.video.setAttribute("controlslist", "nodownload noremoteplayback nofullscreen");
        this.video.setAttribute("aria-hidden", "true");

        this.status = document.createElement("span");
        this.status.className = "status";
        this.status.textContent = "Protected content unavailable";
        this.status.setAttribute("role", "status");
        shadow.append(style, this.video, this.status);
        if (tag === "secure-h1") {
          this.setAttribute("role", "heading");
          this.setAttribute("aria-level", "1");
        }
      }

      connectedCallback() {
        // This isn't a sanitization boundary. Plaintext children are already
        // present in the live DOM and MUST NEVER be supplied by callers.
        if (this.childNodes.length !== 0) {
          this.setBlocked("Inline text is forbidden. Use an opaque asset-id.");
          return;
        }
        void this.load();
      }
      disconnectedCallback() { this.cancel(); }
      attributeChangedCallback() {
        if (this.isConnected) void this.load();
      }
      private setBlocked(message: string) {
        this.setAttribute("data-state", "blocked");
        this.video.hidden = true;
        this.status.hidden = false;
        this.status.textContent = message;
      }
      private cancel() {
        ++this.generation;
        this.controller?.abort();
        this.controller = undefined;
        const old = this.playback;
        this.playback = undefined;
        this.video.hidden = true;
        this.video.pause();
        if (old) void old.destroy().catch(() => undefined);
      }

      private async load() {
        this.cancel();
        const run = this.generation;
        if (this.childNodes.length !== 0) {
          this.setBlocked("Inline text is forbidden. Use an opaque asset-id.");
          return;
        }
        const id = this.getAttribute("asset-id");
        if (!id || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
          this.setBlocked("Missing or invalid opaque asset-id.");
          return;
        }
        const controller = new AbortController();
        this.controller = controller;
        this.setBlocked("Checking DRM-encrypted synthetic media...");
        try {
          const asset = await adapters.resolveAsset(id, controller.signal);
          if (controller.signal.aborted || run !== this.generation) return;
          validateSyntheticDrmAsset(asset, location.href);
          this.video.style.aspectRatio = String(asset.aspectRatio ?? 8);
          const handle = await startSyntheticPlayback(this.video, {
            classification: "synthetic-test-only",
            encryptedMediaUrl: asset.encryptedMediaUrl,
            keySystem: asset.keySystem,
            contentType: asset.contentType,
            robustness: asset.robustness,
            serverCertificate: asset.serverCertificate,
            requestLicense: (challenge, messageType) =>
              adapters.requestLicense(id, challenge, messageType, controller.signal),
            onStatus: (state) => {
              if (controller.signal.aborted || run !== this.generation) return;
              if (state === "blocked") {
                this.setBlocked("DRM media or output policy was rejected.");
              } else if (state === "license-usable") {
                this.status.hidden = true;
                this.setAttribute("data-state", "synthetic-test");
                void this.video.play().catch(() => {
                  if (run === this.generation) this.setBlocked("Playback is blocked.");
                });
              }
            },
          });
          if (controller.signal.aborted || run !== this.generation) {
            await handle.destroy();
            return;
          }
          this.playback = handle;
        } catch (error) {
          if (run === this.generation && !controller.signal.aborted) {
            if (error instanceof SecureDisplaySetupError) {
              this.setAttribute("data-reason", "provider-unconfigured");
              this.setBlocked("DRM test provider is not configured.");
            } else {
              this.setAttribute("data-reason", "asset-or-drm-failure");
              this.setBlocked("DRM asset or playback failed. Check browser diagnostics.");
            }
          }
        }
      }
    };
  }

  for (const tag of SECURE_ELEMENT_TAGS) customElements.define(tag, createElementClass(tag));
}
