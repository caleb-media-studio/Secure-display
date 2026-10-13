import {registerSecureDiv} from "@caleb-media-studio-llc/secure-display";
import {startEncryptedVideo} from "./drm-player.js";

// One authoritative HTML/CSS source is also used by the build-time renderer.
// A source change should require a newly packaged asset.
const state=document.querySelector("#state");
const log=document.querySelector("#log");
const clicks=document.querySelector("#clicks");
const selectionStatus=document.querySelector("#selection-status");
const container=document.querySelector("#mount");
let count=0;
const fail=message=>{
 state.textContent="BLOCKED: "+message;
 log.textContent=message;
};
async function main(){
 registerSecureDiv(async(video,signal,assetId,sourceSha256)=>{
  if(assetId!=="demo-card")throw Error("Unknown synthetic asset identifier.");
  const {player,provider,meta}=await startEncryptedVideo(video,signal,sourceSha256);
  return {destroy:()=>player.destroy(),drm:provider.type,width:meta.width,height:meta.height};
 });
 const r=await fetch("/secure-content.html",{cache:"no-store"});
 if(!r.ok)throw Error("Synthetic HTML source unavailable.");
 const text=await r.text();
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
 const checksum=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
 const doc=new DOMParser().parseFromString(text,"text/html");
 const source=doc.querySelector("#snapshot-source");
 const rules=doc.querySelector("#secure-fixture-style");
 if(!source||!rules)throw Error("Source HTML or CSS missing.");
 document.head.appendChild(document.importNode(rules,true));
 const secure=document.createElement("secure-div");
 secure.setAttribute("data-asset-id","demo-card");
 secure.setAttribute("data-source-sha256",checksum);
 secure.className=source.className;
 // Preserve the original HTML structure and styling. No handcrafted DRM
 // screenshot pixels exist anywhere in client JS.
 secure.innerHTML=source.innerHTML;
 secure.addEventListener("secure-state-change",event=>{
  const details=event.detail;
  if(details.state==="playing"){
   state.textContent="Protected pixels playing via "+details.drm+". Test physical display vs screenshot.";
   log.textContent="Browser rendered the ORIGINAL HTML at build time. Current DOM is transparent but clickable; DRM video is visible. No first-paint plaintext fallback.";
  }else fail(details.reason||"DRM rendering not available");
 });
 secure.addEventListener("secure-selection-change",event=>{
  const {selectedCharacters,highlightRects}=event.detail;
  selectionStatus.textContent=selectedCharacters>0
   ?"Native text selected: "+selectedCharacters+" characters across "+highlightRects+
      " highlight region(s). Drag to adjust; Cmd/Ctrl+C uses the browser's normal selection."
   :"No protected text selected. Drag over the paragraph or heading.";
 });
 secure.querySelector("#real-button").addEventListener("click",()=>{
  count+=1;
  clicks.textContent="Real DOM button clicks: "+count;
 });
 container.appendChild(secure);
 state.textContent="Loading encrypted media for the original HTML element…";
}
main().catch(error=>fail(error.message));
