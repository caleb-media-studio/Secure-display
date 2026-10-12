export const PAGE_PACKAGE_HINT="The encrypted page fixture was not found. Run bun run drm:page:package, then restart bun run example:page.";

export function isMediaManifest(kind,body) {
 if(typeof body!=="string") return false;
 const text=body.trimStart();
 if(kind==="fairplay") return text.startsWith("#EXTM3U") && /#EXT-X-(?:STREAM-INF|SESSION-KEY|MEDIA)/.test(text);
 if(kind==="widevine") return /<(?:[A-Za-z0-9_-]+:)?MPD(?:\s|>)/.test(text) && text.includes("ContentProtection");
 return false;
}
export function safePlaybackError(error) {
 if(Number.isInteger(error?.code)) return "Shaka playback error "+error.code+" (category "+(error.category??"unknown")+").";
 if(error instanceof Error) return error.message.slice(0,300);
 return "DRM playback failed. See diagnostics.";
}
