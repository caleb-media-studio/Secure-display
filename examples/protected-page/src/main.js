import shaka from "shaka-player";
import {MODES,modePolicy,drmSource} from "./mode-policy.js";

// The phrase is intentionally PUBLIC synthetic test content for comparing
// screenshots. The normal DOM mode must not be used with confidential data.
const TOKEN_URL="https://raw.githubusercontent.com/Axinom/public-test-vectors/master/ContentKeys/Axinom-Encoding-Cmaf-H264-protected-SingleKey.txt";
const video=document.querySelector("#protected-video");
const root=document.querySelector("#experiment");
const dom=document.querySelector("#dom-page");
const hotspot=document.querySelector("#protected-hotspot");
const modeButtons=[...document.querySelectorAll("[data-mode]")];
const drmSelect=document.querySelector("#drm");
const start=document.querySelector("#start");
const status=document.querySelector("#status");
const diagnostic=document.querySelector("#diagnostic");
const interactions=document.querySelector("#interactions");
const query=new URLSearchParams(location.search);
let mode=MODES.includes(query.get("mode"))?query.get("mode"):"protected";
const safari=/Safari/i.test(navigator.userAgent)&&!/(Chrome|Chromium|CriOS|Edg|OPR|FxiOS)/i.test(navigator.userAgent);
drmSelect.value=safari?"fairplay":"widevine";
let player,run=0,playing=false,clicks=0;
let publicToken;
const log=text=>{
 const line="["+new Date().toLocaleTimeString()+"] "+text;
 diagnostic.textContent=(diagnostic.textContent==="Ready."?"":diagnostic.textContent+"\n")+line;
};
function updateMode(){
 const rule=modePolicy(mode,playing);
 root.dataset.mode=mode;
 dom.hidden=!rule.showDom;
 video.hidden=!rule.showVideo;
 video.style.opacity=String(rule.videoOpacity);
 hotspot.hidden=!rule.enableProtectedHotspot;
 hotspot.disabled=!rule.enableProtectedHotspot;
 for(const b of modeButtons){
  const active=b.dataset.mode===mode;
  b.setAttribute("aria-pressed",String(active));
  b.classList.toggle("active",active);
 }
 const url=new URL(location.href);
 url.searchParams.set("mode",mode);
 history.replaceState(null,"",url);
 const description=mode==="protected"
  ?"Only DRM pixels form the page; no test sentence is visible in ordinary DOM."
  :mode==="overlay"
    ?"Ordinary HTML is visible underneath a DRM video with CSS opacity 0.015. This is NOT a true transparent DRM video and is not expected to protect DOM pixels."
    :"All page text is ordinary DOM, with no DRM layer.";
 document.querySelector("#mode-description").textContent=description;
 if(mode==="protected"&&!playing)
   status.textContent="Protected mode is BLOCKED until real licensed DRM video is playing.";
 else if(mode==="protected")
   status.textContent="Licensed DRM playback active. Check physical display vs screenshot and recording.";
 else if(mode==="overlay")
   status.textContent=playing?"Overlay active. Check whether ordinary HTML is still capturable.":"DOM visible, but DRM overlay has NOT started.";
 else status.textContent="Unprotected DOM control. Screenshots should contain the sentence.";
}
function setMode(value) {
 if(!MODES.includes(value))return;
 mode=value;
 updateMode();
}
modeButtons.forEach(button=>button.addEventListener("click",()=>setMode(button.dataset.mode)));
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
 playing=false;
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
 const id=++run;
 start.disabled=true;
 diagnostic.textContent="";
 const chosen=drmSelect.value;
 let instance;
 try {
  if(!window.isSecureContext)throw Error("Use HTTPS with a trusted CA (or localhost). LAN HTTP cannot run DRM.");
  const config=drmSource(chosen);
  const token=await getPublicToken();
  if(id!==run)return;
  shaka.polyfill.installAll();
  if(!shaka.Player.isBrowserSupported())throw Error("Shaka reports browser unsupported.");
  instance=new shaka.Player();
  player=instance;
  instance.addEventListener("error",e=>{
   if(id!==run)return;
   reportError(e.detail,"Playback");
   playing=false;
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
  log("Loading encrypted "+chosen+" media. Clear media fallback is forbidden.");
  await instance.load(config.manifest);
  if(id!==run)return;
  if(instance.drmInfo()?.keySystem!==config.keySystem)
    throw Error("Selected EME DRM system could not be verified.");
  log("Verified EME key system: "+config.keySystem+". Awaiting actual video playback.");
  // Never await a user-gesture-gated play promise indefinitely.
  void video.play().catch(()=>{
    if(id===run)log("Autoplay blocked; press Start / Retry DRM again with an active user gesture.");
  });
  if(id!==run)return;
  // The playing event independently enables protected pixels.
 }catch(e){
  if(id!==run)return;
  if(e&&Number.isInteger(e.code))reportError(e,"Initialization");
  else log("Unable to start DRM test: "+(e instanceof Error?e.message:"unknown error"));
  playing=false;
  updateMode();
 }finally{if(id===run)start.disabled=false;}
}
video.addEventListener("playing",()=>{
 if(!player)return;
 playing=true;
 log("Video element is playing. Capture exclusion must be checked on device.");
 updateMode();
});
video.addEventListener("error",()=>{
 if(!player)return;
 playing=false;
 log("Native media error code "+(video.error?.code??"unknown"));
 updateMode();
});
start.addEventListener("click",()=>void startPlayback());
drmSelect.addEventListener("change",()=>void release());
updateMode();
log("Begin in full protected mode. Load DRM, then compare all three modes.");
