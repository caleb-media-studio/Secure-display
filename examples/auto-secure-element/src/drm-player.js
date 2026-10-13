import shaka from "shaka-player";

const TOKEN_URL="https://raw.githubusercontent.com/Axinom/public-test-vectors/master/ContentKeys/Axinom-Encoding-Cmaf-H264-protected-SingleKey.txt";
export function supportedDRM(){
 const safari=/Safari/i.test(navigator.userAgent) && !/(Chrome|CriOS|Chromium|Edg|FxiOS|OPR)/i.test(navigator.userAgent);
 return safari?{
  type:"fairplay",keySystem:"com.apple.fps",
  manifest:"/secure-asset/master.m3u8",
  license:"https://drm-fairplay-licensing.axprod.net/AcquireLicense",
  certificate:"https://tools.axinom.com/FPScert/fairplay.cer",
 }:{
  type:"widevine",keySystem:"com.widevine.alpha",
  manifest:"/secure-asset/master.mpd",
  license:"https://drm-widevine-licensing.axprod.net/AcquireLicense",
 };
}
let tokenPromise;
async function publicToken(){
 if(!tokenPromise)tokenPromise=(async()=>{
  const r=await fetch(TOKEN_URL,{signal:AbortSignal.timeout(15000),cache:"no-store"});
  if(!r.ok)throw Error("Axinom public-test entitlement unavailable.");
  const m=(await r.text()).match(/X-AxDRM-Message header:\s*([\w-]+\.[\w-]+\.[\w-]+)/i);
  if(!m)throw Error("Missing public-test entitlement token.");
  return m[1];
 })().catch(e=>{tokenPromise=undefined;throw e;});
 return tokenPromise;
}
export async function startEncryptedVideo(video,signal,sourceSha256){
 if(!window.isSecureContext)throw Error("Protected playback requires trusted HTTPS (or localhost).");
 const provider=supportedDRM();
 const [meta,token]=await Promise.all([
  fetch("/secure-asset/asset-info.json",{cache:"no-store",signal}).then(async r=>{
    if(!r.ok)throw Error("Encrypted DOM asset missing. Run bun run drm:element:package.");
    return r.json();
  }),
  publicToken(),
 ]);
 if(meta?.kind!=="automated-dom-drm-v1"||meta?.classification!=="synthetic-test-only"||
    meta?.assetId!=="demo-card"||meta?.width!==960||meta?.height!==540)
   throw Error("Synthetic encrypted DOM package invalid or stale.");
 if(!/^[a-f0-9]{64}$/i.test(sourceSha256)||meta.sourceSha256!==sourceSha256)
   throw Error("HTML/CSS source differs from the encrypted build. Re-run bun run drm:element:package.");
 if(signal.aborted)throw Error("Session canceled.");
 shaka.polyfill.installAll();
 if(!shaka.Player.isBrowserSupported())throw Error("Browser does not support the Shaka DRM playback path.");
 const p=new shaka.Player();
 try {
  await p.attach(video);
  p.configure({
   drm:{servers:{[provider.keySystem]:provider.license},
     advanced:provider.certificate?{[provider.keySystem]:{serverCertificateUri:provider.certificate}}:{}},
   streaming:{useNativeHlsForFairPlay:provider.type==="fairplay"},
  });
  p.getNetworkingEngine().registerRequestFilter((type,request)=>{
   if(type!==shaka.net.NetworkingEngine.RequestType.LICENSE)return;
   request.headers??={};
   request.headers["X-AxDRM-Message"]=token;
  });
  video.muted=true;video.loop=true;video.playsInline=true;video.controls=false;
  await p.load(provider.manifest);
  if(signal.aborted)throw Error("Session canceled.");
  if(p.drmInfo()?.keySystem!==provider.keySystem)
    throw Error("Selected DRM key system was not confirmed.");
  await video.play();
  if(signal.aborted)throw Error("Session canceled.");
  return {player:p,provider,meta};
 }catch(e){await p.destroy().catch(()=>{});throw e;}
}
