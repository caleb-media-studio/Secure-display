import {createElement, useEffect, useRef, type HTMLAttributes, type ReactNode, type ReactElement} from "react";
import {hashProtectedChildren, registerSecureDiv, type SecureDivPlaybackAdapter} from "@secure-display/secure-div";
import {getSecureDisplayConfiguration} from "./configureSecureDisplay.js";

export interface SecureDivState {
  state: "loading" | "playing" | "blocked" | "stale";
  drm?: string;
  reason?: string;
}
export interface SecureDivSelection {
  native: boolean;
  highlightRects: number;
  selectedCharacters: number;
  visibleIndicatorIsCapturable: true;
}
export interface SecureDivProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Optional for advanced usage; the normal JSX API auto-resolves a packaged asset. */
  assetId?: string;
  sourceSha256?: string;
  playbackAdapter?: SecureDivPlaybackAdapter;
  children?: ReactNode;
  onSecureStateChange?: (value: SecureDivState) => void;
  onSecureSelectionChange?: (value: SecureDivSelection) => void;
}

/**
 * One tag around ordinary JSX. The package hides DOM paint and resolves a
 * prepackaged DRM asset; JSX alone never creates capture-protected pixels.
 * Client-side dynamic content MUST match the packaged DOM and may fail closed.
 */
export function SecureDiv({
  assetId, sourceSha256, playbackAdapter, children,
  onSecureStateChange, onSecureSelectionChange, style, ...rest
}: SecureDivProps): ReactElement {
  const ref = useRef<HTMLElement | null>(null);

  // Attach events before customElements.define() can upgrade the element.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const onState = (event: Event) =>
      onSecureStateChange?.((event as CustomEvent<SecureDivState>).detail);
    const onSelection = (event: Event) =>
      onSecureSelectionChange?.((event as CustomEvent<SecureDivSelection>).detail);
    node.addEventListener("secure-state-change", onState);
    node.addEventListener("secure-selection-change", onSelection);
    return () => {
      node.removeEventListener("secure-state-change", onState);
      node.removeEventListener("secure-selection-change", onSelection);
    };
  }, [onSecureStateChange, onSecureSelectionChange]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const controller = new AbortController();
    const blocked = (reason: string) => {
      if (controller.signal.aborted) return;
      node.removeAttribute("data-source-sha256");
      node.setAttribute("data-secure-state", "blocked");
      node.dispatchEvent(new CustomEvent<SecureDivState>("secure-state-change", {
        detail: {state:"blocked",reason}
      }));
    };
    const start = async () => {
      try {
        const config = getSecureDisplayConfiguration();
        const adapter = playbackAdapter ?? config?.playbackAdapter;
        if (!adapter) throw Error("Configure a licensed Secure Display adapter before use.");
        registerSecureDiv(adapter);

        // Advanced callers may still bind a prebuilt asset explicitly.
        if (assetId !== undefined || sourceSha256 !== undefined) {
          if (!assetId || !/^[a-f0-9]{64}$/i.test(sourceSha256 ?? ""))
            throw Error("An explicit asset needs both ID and source SHA256.");
          node.setAttribute("data-asset-id", assetId);
          node.setAttribute("data-source-sha256", sourceSha256!);
          return;
        }

        if (!config) throw Error("No automatic DRM asset resolver configured.");
        const asset = await config.resolveAsset(node, controller.signal);
        if (controller.signal.aborted) return;
        if (!/^[a-zA-Z0-9_-]{1,128}$/.test(asset.assetId) ||
            !/^[a-f0-9]{64}$/i.test(asset.sourceSha256) ||
            !/^[a-f0-9]{64}$/i.test(asset.domSha256) ||
            typeof asset.rootClassName !== "string")
          throw Error("Packaged DRM asset binding is invalid.");
        // A React element that differs from the asset MUST NOT show old pixels.
        const actual = await hashProtectedChildren(node);
        if (controller.signal.aborted) return;
        if (actual !== asset.domSha256 || node.className !== asset.rootClassName)
          throw Error("JSX differs from the encrypted asset. Rebuild before displaying.");
        node.setAttribute("data-asset-id",asset.assetId);
        node.setAttribute("data-dom-sha256",asset.domSha256);
        node.setAttribute("data-source-sha256",asset.sourceSha256);
      } catch (error) {
        blocked(error instanceof Error ? error.message : "Protected asset unavailable.");
      }
    };
    void start();
    return () => { controller.abort(); };
  }, [assetId, sourceSha256, playbackAdapter]);

  // SSR and hydration always keep original DOM paint suppressed.
  // Load the !important guard CSS in the document head before HTML first paint.
  return createElement("secure-div", {
    ...rest, ref,
    "data-asset-id": assetId,
    "data-source-sha256": sourceSha256,
    style: {...style, opacity: 0},
  }, children);
}
