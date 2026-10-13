/**
 * Comparison modes for empirical screen capture tests.
 * Near-invisible overlay behavior is not assumed; verify by capture.
 */
export const MODES=Object.freeze(["protected","overlay","normal"]);
// 0.0000001% expressed as a CSS opacity fraction, not a percentage.
export const NEAR_INVISIBLE_OPACITY=0.000000001;
/** Explicit percentages ensure exact, reproducible tests at tiny alpha. */
export const OPACITY_PRESETS=Object.freeze([
 {label:"0%",alpha:0},
 {label:"0.0000001%",alpha:0.000000001},
 {label:"0.000001%",alpha:0.00000001},
 {label:"0.00001%",alpha:0.0000001},
 {label:"0.0001%",alpha:0.000001},
 {label:"0.001%",alpha:0.00001},
 {label:"0.01%",alpha:0.0001},
 {label:"0.1%",alpha:0.001},
 {label:"0.4%",alpha:0.004},
 {label:"1%",alpha:0.01},
 {label:"5%",alpha:0.05},
 {label:"10%",alpha:0.1},
 {label:"25%",alpha:0.25},
 {label:"50%",alpha:0.5},
 {label:"100%",alpha:1},
].map(p=>Object.freeze(p)));
export function opacityPreset(index){
 if(!Number.isInteger(index)||index<0||index>=OPACITY_PRESETS.length)
   throw Error("Invalid opacity preset.");
 return OPACITY_PRESETS[index];
}
export function modePolicy(mode,drmPlaying,overlayOpacity=NEAR_INVISIBLE_OPACITY){
 if(!MODES.includes(mode)) throw Error("Unknown experiment mode.");
 if(!Number.isFinite(overlayOpacity)||overlayOpacity<0||overlayOpacity>1)
   throw Error("Invalid overlay opacity.");
 if(mode==="normal")return Object.freeze({
  showDom:true,showVideo:false,videoOpacity:0,enableProtectedHotspot:false,
 });
 if(mode==="overlay")return Object.freeze({
  showDom:true,showVideo:Boolean(drmPlaying),videoOpacity:overlayOpacity,
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
