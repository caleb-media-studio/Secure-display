import shaka from "shaka-player";
import {MODES,modePolicy,drmSource,OPACITY_PRESETS,opacityPreset} from "./mode-policy.js";

// The phrase is intentionally PUBLIC synthetic test content for comparing
// screenshots. The normal DOM mode must not be used with confidential data.
const TOKEN_URL="https://raw.githubusercontent.com/Axinom/public-test-vectors/master/ContentKeys/Axinom-Encoding-Cmaf-H264-protected-SingleKey.txt";
const video=document.querySelector("#protected-video");
const guard=document.querySelector("#protected-guard");
const root=document.querySelector("#experiment");
const dom=document.querySelector("#dom-page");
const hotspot=document.querySelector("#protected-hotspot");
const modeButtons=[...document.querySelectorAll("[data-mode]")];
const drmSelect=document.querySelector("#drm");
const start=document.querySelector("#start");
const status=document.querySelector("#status");
const diagnostic=document.querySelector("#diagnostic");
const interactions=document.querySelector("#interactions");
const metrics=document.querySelector("#overlay-metrics");
const opacitySlider=document.querySelector("#opacity-slider");
const opacityValue=document.querySelector("#opacity-value");
const opacityCSS=document.querySelector("#opacity-css");
const referenceButton=document.querySelector("#reference-start");
const referenceStatus=document.querySelector("#reference-status");
const drmReference=document.querySelector("#drm-reference-video");
const clearReference=document.querySelector("#clear-reference-video");

const query=new URLSearchParams(location.search);
let mode=MODES.includes(query.get("mode"))?query.get("mode"):"overlay";
const requestedPreset=query.has("opacity")?Number(query.get("opacity")):1;
let opacityIndex=Number.isInteger(requestedPreset)&&requestedPreset>=0&&requestedPreset<OPACITY_PRESETS.length?requestedPreset:1;
opacitySlider.max=String(OPACITY_PRESETS.length-1);
opacitySlider.value=String(opacityIndex);
const safari=/Safari/i.test(navigator.userAgent)&&!/(Chrome|Chromium|CriOS|Edg|OPR|FxiOS)/i.test(navigator.userAgent);
drmSelect.value=safari?"fairplay":"widevine";
let player,run=0,playing=false,clicks=0;
let drmVerified=false,mediaIsPlaying=false;
let phase='Loading encrypted page DRM test...';
let playbackError='';
let publicToken;
const log=text=>{
 const line="["+new Date().toLocaleTimeString()+"] "+text;
 diagnostic.textContent=(diagnostic.textContent==="Ready."?"":diagnostic.textContent+"\n")+line;
};
function updateMode(){
 const preset=opacityPreset(opacityIndex);
 const rule=modePolicy(mode,playing,preset.alpha);
 opacitySlider.value=String(opacityIndex);
 opacitySlider.disabled=mode!=="overlay";
 opacityValue.textContent=preset.label;
 opacityCSS.textContent="CSS opacity: "+preset.alpha.toFixed(9);
 root.dataset.mode=mode;
 dom.hidden=!rule.showDom;
 video.hidden=!rule.showVideo && !(player && mode!=="normal");
 // CSS must receive decimal syntax, never scientific notation such as 1e-9.
 video.style.opacity=rule.videoOpacity.toFixed(9);
 guard.hidden=mode!=="protected" || rule.showVideo;
 hotspot.hidden=!rule.enableProtectedHotspot;
 hotspot.disabled=!rule.enableProtectedHotspot;
 for(const b of modeButtons){
  const active=b.dataset.mode===mode;
  b.setAttribute("aria-pressed",String(active));
  b.classList.toggle("active",active);
 }
 const url=new URL(location.href);
 url.searchParams.set("mode",mode);
 url.searchParams.set("opacity",String(opacityIndex));
 history.replaceState(null,"",url);
 const description=mode==="protected"
  ?"Control: 100% opaque encrypted BLACK video, with no text, graphics or simulated buttons. Normal DOM is hidden here."
  :mode==="overlay"
    ?"Testing a solid BLACK DRM video at "+preset.label+" over ordinary, interactive HTML. All visible lettering comes from the DOM; the video has no graphics."
    :"All page text is ordinary DOM, with no DRM layer.";
 document.querySelector("#mode-description").textContent=description;
 if(mode==="protected"&&!playing)
   status.textContent=playbackError||phase;
 else if(mode==="protected")
   status.textContent="Encrypted black video is playing. This status does not verify screenshot exclusion; compare with the color reference below.";
 else if(mode==="overlay")
   status.textContent=playing?"Encrypted black video playing at "+preset.label+". DOM remains ordinary and capturable until tested otherwise.":(playbackError||phase);
 else status.textContent="Unprotected DOM control. Screenshots should contain the sentence.";
}
function setMode(value) {
 if(!MODES.includes(value))return;
 mode=value;
 updateMode();
}
modeButtons.forEach(button=>button.addEventListener("click",()=>setMode(button.dataset.mode)));
opacitySlider.addEventListener("input",()=>{
 opacityIndex=Number(opacitySlider.value);
 // No DRM teardown or new license request: this only updates video.style.opacity.
 if(mode!=="overlay")mode="overlay";
 updateMode();
 updateOverlayMetrics();
});
opacitySlider.addEventListener("change",()=>{
 log("Opacity now "+opacityPreset(opacityIndex).label+"; CSS alpha "+opacityPreset(opacityIndex).alpha.toFixed(9)+". DRM playback unchanged.");
});
function activity() {
 clicks+=1;
 interactions.textContent="Interaction count: "+clicks+" (this counter is ordinary, capturable DOM)";
}
hotspot.addEventListener("click",activity);
dom.querySelector("button").addEventListener("click",activity);
async function getPublicToken(){
 if(!publicToken)publicToken=(async()=>{
  const r=await fetch(TOKEN_URL,{cache:"no-store",signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error("Public test entitlement fetch failed (HTTP "+r.status+").");
  const match=(await r.text()).match(/X-AxDRM-Message header:\s*([\w-]+\.[\w-]+\.[\w-]+)/i);
  if(!match)throw Error("Public test entitlement is missing.");
  return match[1];
 })().catch(error=>{publicToken=undefined;throw error;});
 return publicToken;
}
function reportError(error,label){
 const code=Number.isInteger(error?.code)?error.code:"unknown";
 const category=Number.isInteger(error?.category)?error.category:"unknown";
 log(label+": Shaka category "+category+", code "+code+".");
}
async function release(){
 ++run;
 playing=false;drmVerified=false;mediaIsPlaying=false;
 const prior=player;player=null;
 video.hidden=true;
 video.pause();
 if(prior)await prior.destroy().catch(()=>undefined);
 video.removeAttribute("src");
 video.load();
 updateMode();
}
async function startPlayback(){
 await release();
 playbackError="";
 phase="Checking HTTPS and local encrypted media...";
 const id=++run;
 start.disabled=true;
 diagnostic.textContent="";
 updateMode();
 const chosen=drmSelect.value;
 let instance;
 try {
  if(!window.isSecureContext)throw Error("Use HTTPS with a trusted CA (or localhost). LAN HTTP cannot run DRM.");
  const config=drmSource(chosen);
  // Fail explicitly if the old graphic-backed DRM fixture is still present.
  // The overlay experiment must use an encrypted BLACK-only video.
  const markerResponse=await fetch("/drm-page/fixture-info.json",{
   cache:"no-store",credentials:"same-origin",
  });
  if(!markerResponse.ok)throw Error("Black DRM fixture missing. Re-run bun run drm:page:package.");
  let marker;
  try{marker=await markerResponse.json();}catch{
    throw Error("Black DRM fixture metadata invalid. Re-run bun run drm:page:package.");
  }
  if(marker?.kind!=="solid-black-v1" || marker?.width!==1280 || marker?.height!==720)
    throw Error("Outdated graphic DRM fixture detected. Re-run bun run drm:page:package.");
  log("Verified local DRM source is a solid black 1280x720 video. DOM supplies all text and controls.");
  const manifest=await fetch(config.manifest,{cache:"no-store",credentials:"same-origin"});
  if(!manifest.ok)throw Error("DRM media is missing (HTTP "+manifest.status+"). Run bun run drm:page:package.");
  const body=await manifest.text();
  const recognized=chosen==="fairplay"
    ? body.trimStart().startsWith("#EXTM3U") && body.includes("#EXT-X-STREAM-INF")
    : /<MPD[\s>]/.test(body) && body.includes("ContentProtection");
  if(!recognized)throw Error("No encrypted DRM page manifest found. Run bun run drm:page:package and restart Vite.");
  log("Encrypted "+chosen+" media manifest found.");
  phase="Requesting public Axinom test license entitlement...";
  updateMode();
  const token=await getPublicToken();
  if(id!==run)return;
  shaka.polyfill.installAll();
  if(!shaka.Player.isBrowserSupported())throw Error("Shaka reports browser unsupported.");
  instance=new shaka.Player();
  player=instance;
  instance.addEventListener("error",e=>{
   if(id!==run)return;
   reportError(e.detail,"Playback");
   playbackError="DRM playback failed: Shaka error "+(e.detail?.code??"unknown")+". Expand diagnostics.";
   playing=false;drmVerified=false;mediaIsPlaying=false;
   updateMode();
  });
  await instance.attach(video);
  if(id!==run)return;
  instance.configure({
   drm:{servers:{[config.keySystem]:config.licenseUrl},
    advanced:config.certificateUrl?{[config.keySystem]:{serverCertificateUri:config.certificateUrl}}:{}},
   streaming:{useNativeHlsForFairPlay:chosen==="fairplay"},
  });
  instance.getNetworkingEngine().registerRequestFilter((type,request)=>{
   if(type!==shaka.net.NetworkingEngine.RequestType.LICENSE)return;
   request.headers??={};
   request.headers["X-AxDRM-Message"]=token;
   log("Public test DRM license requested.");
  });
  // Shaka may need a visible media element to initialize Safari's EME path.
  video.hidden=false;
  video.muted=true;
  video.loop=true;
  video.playsInline=true;
  video.controls=false;
  phase="Loading "+chosen+" encrypted video and requesting DRM license...";
  updateMode();
  log("Loading encrypted "+chosen+" media. Clear media fallback is forbidden.");
  await instance.load(config.manifest);
  if(id!==run)return;
  if(instance.drmInfo()?.keySystem!==config.keySystem)
    throw Error("Selected EME DRM system could not be verified.");
  phase="DRM session verified. Waiting for protected video playback...";
  updateMode();
  drmVerified=true;
  if(mediaIsPlaying) playing=true;
  updateMode();
  log("Verified EME key system: "+config.keySystem+". Awaiting actual video playback.");
  // Never await a user-gesture-gated play promise indefinitely.
  void video.play().catch(()=>{
    if(id===run) {
      playbackError="Playback was blocked by the browser. Press Start / Retry DRM.";
      log("Autoplay blocked; press Start / Retry DRM again with an active user gesture.");
      updateMode();
    }
  });
  if(id!==run)return;
  // The playing event independently enables protected pixels.
 }catch(e){
  if(id!==run)return;
  if(e&&Number.isInteger(e.code))reportError(e,"Initialization");
  else log("Unable to start DRM test: "+(e instanceof Error?e.message:"unknown error"));
  playbackError=e instanceof Error
    ? "DRM could not start: "+(Number.isInteger(e.code)?"Shaka "+e.code:e.message)
    : "DRM could not start. See diagnostics.";
  playing=false;drmVerified=false;mediaIsPlaying=false;
  updateMode();
 }finally{if(id===run)start.disabled=false;}
}
video.addEventListener("playing",()=>{
 if(!player)return;
 mediaIsPlaying=true;
 if(!drmVerified){
   log("Media playing event received; waiting for DRM key system verification.");
   return;
 }
 playing=true;
 log("Verified DRM video is playing; compare physical screen with captured output.");
 updateMode();
});
video.addEventListener("error",()=>{
 if(!player)return;
 playing=false;drmVerified=false;mediaIsPlaying=false;
 playbackError="Media playback failed: decoder error "+(video.error?.code??"unknown")+".";
 log(playbackError);
 updateMode();
});
start.addEventListener("click",()=>void startPlayback());
drmSelect.addEventListener("change",()=>void release());
updateMode();
log("Near-invisible full-viewport DRM overlay experiment: attempting public Axinom test playback.");

// Keep a separate diagnostic of whether media playback continues at tiny opacity.
// These counters don't tell us what the browser screenshot compositor captures.
function updateOverlayMetrics(){
 if(!metrics)return;
 const style=getComputedStyle(video);
 const quality=video.getVideoPlaybackQuality?.();
 const frames=quality?.totalVideoFrames;
 const bounds=video.getBoundingClientRect();
 const fullViewport=bounds.width>=innerWidth && bounds.height>=innerHeight;
 metrics.textContent="Media: ENCRYPTED BLACK VIDEO | EME key system selected: "+(drmVerified?"yes":"no")
   +" | Playback: "+(video.paused?"paused":"running")
   +" | Video time: "+video.currentTime.toFixed(2)+"s"
   +" | Decoded frames: "+(Number.isFinite(frames)?frames:"unavailable")
   +" | Target opacity: "+opacityPreset(opacityIndex).label
   +" | CSS opacity: "+style.opacity
   +" | Pointer events: "+style.pointerEvents
   +" | Overlay covers viewport: "+(fullViewport?"yes":"no");
}
video.addEventListener("playing",updateOverlayMetrics);
video.addEventListener("timeupdate",updateOverlayMetrics);
video.addEventListener("pause",updateOverlayMetrics);
setInterval(updateOverlayMetrics,1000);
updateOverlayMetrics();

// Begin the public test EME workflow on load; the button remains a retry.
void startPlayback();

/**
 * Differential capture calibration: same synthetic magenta/cyan pixels in a
 * FairPlay/Widevine encrypted video and in a clear H.264 video side-by-side.
 * Unlike the black overlay, this probe is visibly non-black on the display,
 * so comparing its screenshot result directly tests protected pixel omission.
 * It does not imply that DOM pixels below an overlay inherit DRM protection.
 */
let referencePlayer=null;
let referenceGeneration=0;
let referencePlaying=false;
function referenceMessage(text){
 referenceStatus.textContent=String(text);
}
async function stopReference(){
 ++referenceGeneration;
 referencePlaying=false;
 const previous=referencePlayer;
 referencePlayer=null;
 drmReference.pause();
 clearReference.pause();
 if(previous)await previous.destroy().catch(()=>undefined);
 drmReference.removeAttribute("src");
 drmReference.load();
 clearReference.removeAttribute("src");
 clearReference.load();
}
async function startReference(){
 await stopReference();
 const id=++referenceGeneration;
 referenceButton.disabled=true;
 referenceMessage("Checking the encrypted color probe media...");
 try {
  if(!window.isSecureContext)throw Error("Trusted HTTPS is required for DRM on this network address.");
  const meta=await fetch("/drm-probe/fixture-info.json",{cache:"no-store",credentials:"same-origin"});
  if(!meta.ok)throw Error("Color DRM probe missing. Re-run bun run drm:page:package.");
  const info=await meta.json().catch(()=>null);
  if(info?.kind!=="color-probe-v1"||info.width!==1280||info.height!==720)
    throw Error("Old color probe detected. Re-run bun run drm:page:package.");
  const config=drmSource(drmSelect.value);
  const manifest=drmSelect.value==="fairplay"?"/drm-probe/master.m3u8":"/drm-probe/master.mpd";
  const manifestCheck=await fetch(manifest,{cache:"no-store",credentials:"same-origin"});
  if(!manifestCheck.ok)throw Error("Encrypted color probe manifest missing. Repackage the full-page test.");
  const token=await getPublicToken();
  if(id!==referenceGeneration)return;

  clearReference.muted=true;
  clearReference.loop=true;
  clearReference.src="/probe-clear.mp4";
  void clearReference.play().catch(()=>undefined);
  const instance=new shaka.Player();
  referencePlayer=instance;
  instance.addEventListener("error",event=>{
   if(id!==referenceGeneration)return;
   const code=event.detail?.code??"unknown";
   referenceMessage("Encrypted probe failed: Shaka error "+code+". No capture conclusion.");
  });
  await instance.attach(drmReference);
  if(id!==referenceGeneration)return;
  instance.configure({
   drm:{servers:{[config.keySystem]:config.licenseUrl},
    advanced:config.certificateUrl?{[config.keySystem]:{serverCertificateUri:config.certificateUrl}}:{}},
   streaming:{useNativeHlsForFairPlay:drmSelect.value==="fairplay"},
  });
  instance.getNetworkingEngine().registerRequestFilter((type,request)=>{
   if(type!==shaka.net.NetworkingEngine.RequestType.LICENSE)return;
   request.headers??={};
   request.headers["X-AxDRM-Message"]=token;
  });
  drmReference.muted=true;
  drmReference.loop=true;
  drmReference.playsInline=true;
  referenceMessage("Loading the licensed DRM color probe...");
  await instance.load(manifest);
  if(id!==referenceGeneration)return;
  if(instance.drmInfo()?.keySystem!==config.keySystem)
    throw Error("Encrypted probe DRM key system was not verified.");
  referencePlaying=true;
  void drmReference.play().catch(error=>{
   if(id===referenceGeneration)referenceMessage("Encrypted probe autoplay blocked: "+(error?.name??"unknown")+". Retry via button.");
  });
  referenceMessage("EME system selected. Both tiles should appear colorful physically. Take an OS screenshot: if only the encrypted left disappears, protected capture omission is demonstrated.");
 }catch(error){
  if(id!==referenceGeneration)return;
  referencePlaying=false;
  referenceMessage("Comparison unavailable: "+(error instanceof Error?error.message:"unknown playback error"));
 }finally{
  if(id===referenceGeneration)referenceButton.disabled=false;
 }
}
referenceButton.addEventListener("click",()=>void startReference());
drmSelect.addEventListener("change",()=>void stopReference().then(()=>{
 referenceMessage("DRM changed. Run the encrypted vs clear reference again.");
}));
drmReference.addEventListener("error",()=>{
 if(referencePlayer)referenceMessage("Encrypted color video decoder error "+(drmReference.error?.code??"unknown")+".");
});
clearReference.addEventListener("error",()=>{
 referenceMessage("Unencrypted reference failed to decode. Check the locally packaged probe-clear.mp4.");
});
