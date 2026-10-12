import shaka from "shaka-player";
import {registerSecureDocumentElement} from "@secure-display/document";

// This demo uses Axinom's publicly documented TEST key and entitlement.
// It is intentionally unsuitable for confidential or production information.
const tokenUrl="https://raw.githubusercontent.com/Axinom/public-test-vectors/master/ContentKeys/Axinom-Encoding-Cmaf-H264-protected-SingleKey.txt";
const page=document.querySelector("secure-document");
const drm=document.querySelector("#drm");
const status=document.querySelector("#selection-status");
const safari=/Safari/i.test(navigator.userAgent) && !/(Chrome|CriOS|Edg|Chromium|FxiOS)/i.test(navigator.userAgent);
drm.value=safari?"fairplay":"widevine";
let tokenPromise;
async function publicTestToken(){
  if(!tokenPromise) tokenPromise=(async()=>{
    const res=await fetch(tokenUrl,{cache:"no-store",signal:AbortSignal.timeout(15000)});
    if(!res.ok) throw Error("Public test entitlement unavailable.");
    const match=(await res.text()).match(/X-AxDRM-Message header:\s*([\w-]+\.[\w-]+\.[\w-]+)/i);
    if(!match) throw Error("Public test entitlement missing.");
    return match[1];
  })();
  return tokenPromise;
}
shaka.polyfill.installAll();
registerSecureDocumentElement({
  async resolveDocument(assetId,signal){
    if(!/^synthetic-report-(fairplay|widevine)$/.test(assetId))
      throw Error("Only synthetic test documents supported.");
    const platform=assetId.split("-").at(-1);
    const response=await fetch("/synthetic-document-"+platform+".json",{
      signal,cache:"no-store",credentials:"same-origin",
    });
    if(!response.ok) throw Error("Run bun run drm:demo:package first.");
    return response.json();
  },
  createPlayer:async()=>new shaka.Player(),
  preparePlayer:async(player,_media,signal)=>{
    const testToken=await publicTestToken();
    if(signal.aborted) return;
    const net=player.getNetworkingEngine();
    net.registerRequestFilter((type,request)=>{
      if(type!==shaka.net.NetworkingEngine.RequestType.LICENSE) return;
      request.headers??={};
      request.headers["X-AxDRM-Message"]=testToken;
    });
  },
});
function updateDocument(){
 page.setAttribute("asset-id","synthetic-report-"+drm.value);
 status.textContent="No text selected.";
}
drm.addEventListener("change",updateDocument);
page.addEventListener("secure-selection-change",event=>{
  const {start,end,collapsed}=event.detail;
  status.textContent=collapsed?"Caret "+start:"Selected positions "+start+" to "+end+" (copy disabled).";
});
updateDocument();
