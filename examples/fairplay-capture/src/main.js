import shaka from "shaka-player";

/**
 * Public vendor DEMO media only. These URLs were published by Dolby in its
 * browser test kit; no organization secrets, key material or user data.
 * Service availability and CORS from localhost are not guaranteed.
 */
const SOURCE = Object.freeze({
  playlist:"https://ott.dolby.com/browser_test_kit/cbcs/p81/24/master.m3u8",
  license:"https://fps.ezdrm.com/api/licenses/auth?assetID=03854522-021f-45bb-a51c-93e7a63d3db9&pX=9d69c5",
  certificate:"https://ott.dolby.com/OnDelKits/fairplay.cer",
});
const video=document.querySelector("#video");
const start=document.querySelector("#start");
const stop=document.querySelector("#stop");
const status=document.querySelector("#status");
const output=document.querySelector("#events");
let player=null;
let lastPosition=0;
let reportedPlaying=false;

function event(label){
  const date=new Date().toLocaleTimeString();
  const entry=`[${date}] ${label}`;
  output.textContent=(output.textContent==="Ready."?"":output.textContent+"\n")+entry;
}
function reportError(error){
  // Never log request bodies, responses, certificates, tokens or DRM messages.
  const code=Number.isInteger(error?.code)?String(error.code):"unknown";
  const category=Number.isInteger(error?.category)?String(error.category):"unknown";
  event(`Playback failed. Shaka category=${category}, code=${code}. Check Safari Web Inspector for network/CORS issues.`);
  status.textContent="DRM test failed or vendor test endpoint unavailable. No protection result established.";
}
async function shutdown(){
  start.disabled=false;
  stop.disabled=true;
  if(player){
    const previous=player;
    player=null;
    await previous.destroy().catch(()=>undefined);
  }
  video.pause();
  video.removeAttribute("src");
  video.load();
}
video.addEventListener("playing",()=>{
  reportedPlaying=true;
  event("Video playback started; DRM status is reported separately.");
});
video.addEventListener("timeupdate",()=>{
  const current=Math.floor(video.currentTime);
  if(current>=lastPosition+3){
    lastPosition=current;
    event("Playback advanced past "+current+" seconds.");
  }
});
video.addEventListener("error",()=>{
  event("Browser media error (numeric code "+(video.error?.code??"unknown")+").");
});
stop.addEventListener("click",()=>{
  void shutdown().then(()=>{status.textContent="Stopped.";event("Playback stopped.");});
});
start.addEventListener("click",()=>{
  void (async()=>{
    await shutdown();
    output.textContent="";
    lastPosition=0;
    reportedPlaying=false;
    start.disabled=true;
    stop.disabled=false;
    status.textContent="Requesting genuine licensed FairPlay-encrypted playback...";
    event("Starting public Dolby FairPlay HLS test (not Apple development SDK).");
    try{
      if(!globalThis.isSecureContext) throw new Error("Secure browser context required");
      if(!shaka.Player.isBrowserSupported()) throw new Error("Shaka reports unsupported browser");
      shaka.polyfill.installAll();
      player=new shaka.Player();
      player.addEventListener("error",e=>reportError(e.detail));
      await player.attach(video);
      if(!player) return;
      player.configure({
        drm:{
          servers:{"com.apple.fps":SOURCE.license},
          advanced:{"com.apple.fps":{serverCertificateUri:SOURCE.certificate}},
        },
        streaming:{useNativeHlsForFairPlay:true},
      });
      const network=player.getNetworkingEngine();
      network.registerRequestFilter(shaka.drm.FairPlay.ezdrmFairPlayRequest);
      network.registerResponseFilter(shaka.drm.FairPlay.commonFairPlayResponse);
      await player.load(SOURCE.playlist);
      if(!player) return;
      const drm=player.drmInfo();
      if(drm?.keySystem!=="com.apple.fps"){
        throw new Error("FairPlay did not initialize; blocked clear fallback.");
      }
      event("DRM key system initialized: com.apple.fps (does NOT certify capture exclusion).");
      try{await video.play();}catch{
        event("Autoplay rejected. Click the video's Play button.");
      }
      status.textContent="FairPlay DRM initialized. Confirm video plays, then try native screenshots and recordings.";
    }catch(error){
      reportError(error);
      await shutdown();
    }
  })();
});
