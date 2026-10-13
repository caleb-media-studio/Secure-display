import {createElement, useEffect, useRef, type HTMLAttributes, type ReactNode} from "react";
import {registerSecureDiv, type SecureDivPlaybackAdapter} from "@secure-display/secure-div";

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
  /** A prepackaged asset ID, never secret content. */
  assetId: string;
  /** SHA-256 of the source document whose pixels were encrypted during packaging. */
  sourceSha256: string;
  /** Optional DRM adapter. Or register the adapter once before rendering. */
  playbackAdapter?: SecureDivPlaybackAdapter;
  children?: ReactNode;
  onSecureStateChange?: (value: SecureDivState) => void;
  onSecureSelectionChange?: (value: SecureDivSelection) => void;
}
/**
 * React bridge to the licensed native custom element, not a magic protection
 * switch for arbitrary JSX. Underlying children remain transparent and native.
 * Source changes require a newly encrypted/validated DRM media asset.
 */
export function SecureDiv({
  assetId, sourceSha256, playbackAdapter, children,
  onSecureStateChange, onSecureSelectionChange, style, ...rest
}: SecureDivProps) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (playbackAdapter) registerSecureDiv(playbackAdapter);
  }, [playbackAdapter]);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const onState = (event: Event) => {
      onSecureStateChange?.((event as CustomEvent<SecureDivState>).detail);
    };
    const onSelection = (event: Event) => {
      onSecureSelectionChange?.((event as CustomEvent<SecureDivSelection>).detail);
    };
    node.addEventListener("secure-state-change", onState);
    node.addEventListener("secure-selection-change", onSelection);
    return () => {
      node.removeEventListener("secure-state-change", onState);
      node.removeEventListener("secure-selection-change", onSelection);
    };
  }, [onSecureStateChange, onSecureSelectionChange]);

  // First HTML paint is transparent, including SSR markup. The consumer must
  // ALSO import the !important CSS guard in document head before first paint.
  return createElement("secure-div", {
    ...rest,
    ref,
    "data-asset-id": assetId,
    "data-source-sha256": sourceSha256,
    style: {...style, opacity: 0},
  }, children);
}
