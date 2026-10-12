import shaka from "shaka-player";
import {registerSecureDocumentElement} from "@secure-display/document";

// No production data, credentials, direct text or vendor keys shipped.
// Place a synthetically DRM-packaged test manifest in ignored public/ only
// AFTER a provider packages our generated clear fixture into encrypted media.
shaka.polyfill.installAll();
registerSecureDocumentElement({
  async resolveDocument(assetId,signal) {
    if(assetId!=="synthetic-report") throw Error("Only synthetic fixtures are allowed.");
    const response=await fetch("/synthetic-document.json",{
      signal,cache:"no-store",credentials:"same-origin",
    });
    if(!response.ok) throw Error("No authorized synthetic DRM document fixture.");
    return response.json();
  },
  createPlayer:async()=>new shaka.Player(),
  preparePlayer:async()=>{
    // Optional license request filters for an approved DRM test provider.
    // Never commit its secrets, entitlement tokens, CKC or SPC messages.
  },
});
document.querySelector("#selection-status").textContent="No selection.";
document.querySelector("secure-document").addEventListener("secure-selection-change",event=>{
  const {start,end,collapsed}=event.detail;
  document.querySelector("#selection-status").textContent=
    collapsed?"Caret position "+start:"Selected character positions "+start+"–"+end+" (copy disabled).";
});
