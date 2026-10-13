/**
 * Comparison modes for empirical screen capture tests.
 * Near-invisible overlay behavior is not assumed; verify by capture.
 */
export const MODES=Object.freeze(["protected","overlay","normal"]);
// 0.0000001% expressed as a CSS opacity fraction, not a percentage.
export const NEAR_INVISIBLE_OPACITY=0.000000001;
export function modePolicy(mode,drmPlaying){
 if(!MODES.includes(mode)) throw Error("Unknown experiment mode.");
 if(mode==="normal")return Object.freeze({
  showDom:true,showVideo:false,videoOpacity:0,enableProtectedHotspot:false,
 });
 if(mode==="overlay")return Object.freeze({
  showDom:true,showVideo:Boolean(drmPlaying),videoOpacity:NEAR_INVISIBLE_OPACITY,
  enableProtectedHotspot:false,
 });
 return Object.freeze({
  showDom:false,showVideo:Boolean(drmPlaying),videoOpacity:1,
  enableProtectedHotspot:Boolean(drmPlaying),
 });
}
export function drmSource(kind){
 if(kind==="fairplay")return {
  keySystem:"com.apple.fps",manifest:"/drm-page/master.m3u8",
  licenseUrl:"https://drm-fairplay-licensing.axprod.net/AcquireLicense",
  certificateUrl:"https://tools.axinom.com/FPScert/fairplay.cer",
 };
 if(kind==="widevine")return {
  keySystem:"com.widevine.alpha",manifest:"/drm-page/master.mpd",
  licenseUrl:"https://drm-widevine-licensing.axprod.net/AcquireLicense",
 };
 throw Error("Unsupported DRM system.");
}
