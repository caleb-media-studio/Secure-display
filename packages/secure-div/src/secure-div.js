
import {selectionGeometry,updateSelectionIndicator} from "./selection-geometry.js";
const ElementBase=typeof HTMLElement==="undefined"?class {}:HTMLElement;
let playbackAdapter=null;
let installedAdapter=null;
const validAssetId=id=>typeof id==="string"&&/^[a-zA-Z0-9_-]{1,128}$/.test(id);
const dimensionsMatch=(box,meta)=>Math.abs(box.width-meta.width)<1&&Math.abs(box.height-meta.height)<1;

/**
 * Research-only custom element. Keeps the *real children* in the light DOM:
 * CSS, event listeners, tabbing and browser native layout remain theirs.
 * Only visible pixels are substituted with packaged DRM video. The host
 * remains 0 opacity for both successful and failed playback to prevent
 * nonprotected pixels from appearing in captures.
 */
export class SecureDiv extends ElementBase {
 static get observedAttributes(){return ["data-asset-id","data-source-sha256"];}
 #player=null;
 #assetDimensions=null;
 #video=null;
 #selectionOverlay=null;
 #controller=null;
 #observer=null;
 #resize=null;
 #position=()=>{this.#syncRect();this.#syncSelection();};
 #selectionUpdate=()=>this.#syncSelection();
 #active=false;

 attributeChangedCallback(name,oldValue,newValue){
  if(oldValue===newValue||!this.isConnected||!this.#controller)return;
  // A hash may arrive after the first React render. Keep native DOM hidden.
  void this.#restart();
 }
 async #restart(){
  this.#controller?.abort();
  const controller=new AbortController();
  this.#controller=controller;
  const old=this.#player;
  this.#player=null;
  this.#active=false;
  this.#assetDimensions=null;
  if(this.#video)this.#video.style.opacity="0";
  this.dataset.secureState="loading";
  this.#syncSelection();
  if(old)await old.destroy().catch(()=>{});
  if(controller.signal.aborted||this.#controller!==controller||!this.isConnected)return;
  await this.#load();
 }

 connectedCallback(){
  this.dataset.secureState="loading";
  this.#controller=new AbortController();
  // Never modify/remove existing children, classes, roles, or event handlers.
  this.#video=document.createElement("video");
  this.#video.className="sd-video-portal";
  this.#video.setAttribute("aria-hidden","true");
  this.#video.setAttribute("tabindex","-1");
  this.#video.muted=true;
  this.#video.playsInline=true;
  this.#video.addEventListener("error",()=>{
   if(this.#active)this.#block("Licensed video decoder failed.");
  });
  this.#video.addEventListener("pause",()=>{
   if(this.#active)this.#block("Protected playback paused. Capture state unknown.");
  });
  this.#video.style.cssText=[
    "position:fixed","z-index:2000000000","pointer-events:none",
    "opacity:0","background:transparent","display:block","margin:0",
    "padding:0","border:0","object-fit:fill","overflow:hidden"
  ].join(";");
  document.body.appendChild(this.#video);
  // The real browser Selection/Range remains inside the original DOM.
  // Only selection *geometry* is painted outside the transparent host.
  // This is a text-free, ordinary-DOM indicator (capturable in screenshots).
  this.#selectionOverlay=document.createElement("div");
  this.#selectionOverlay.setAttribute("data-sd-selection-overlay","");
  this.#selectionOverlay.setAttribute("aria-hidden","true");
  this.#selectionOverlay.style.cssText=[
   "position:fixed","inset:0","width:100vw","height:100vh",
   "z-index:2000000001","pointer-events:none","overflow:hidden",
   "contain:layout paint style"
  ].join(";");
  document.body.appendChild(this.#selectionOverlay);
  document.addEventListener("selectionchange",this.#selectionUpdate);
  this.#syncRect();
  this.#resize=new ResizeObserver(this.#position);
  this.#resize.observe(this);
  addEventListener("resize",this.#position);
  addEventListener("scroll",this.#position,true);
  this.#observer=new MutationObserver(()=>{
   if(!this.#active)return;
   this.#active=false;
   this.dataset.secureState="stale";
   // Source DOM changed but DRM pixels are fixed. Fail closed.
   if(this.#video)this.#video.style.opacity="0";
   this.#syncSelection();
   this.dispatchEvent(new CustomEvent("secure-state-change",{
    detail:{state:"stale",reason:"DOM content changed; regenerate the encrypted asset."}
   }));
  });
  // Class/style edits can invalidate the captured pixels too. Do not
  // observe data-secure-state, which is our own internal status attribute.
  this.#observer.observe(this,{
    childList:true,subtree:true,characterData:true,attributes:true,
    attributeFilter:["class","style","src","value","hidden"],
  });
  void this.#load();
 }
 disconnectedCallback(){
  this.#controller?.abort();
  this.#observer?.disconnect();
  this.#resize?.disconnect();
  removeEventListener("resize",this.#position);
  removeEventListener("scroll",this.#position,true);
  document.removeEventListener("selectionchange",this.#selectionUpdate);
  this.#selectionOverlay?.remove();
  this.#video?.remove();
  void this.#player?.destroy();
  this.#active=false;
  this.#assetDimensions=null;
  this.#selectionOverlay=null;
  this.#video=null;
  this.#player=null;
 }
 #syncRect(){
  if(!this.#video)return;
  const box=this.getBoundingClientRect();
  // Exact geometry is necessary: an aspect ratio match can still stretch text.
  if(this.#active&&this.#assetDimensions&&!dimensionsMatch(box,this.#assetDimensions)){
   this.#block("Protected DOM dimensions changed. Rebuild the encrypted asset.");
   return;
  }
  Object.assign(this.#video.style,{
   left:box.left+"px",top:box.top+"px",
   width:box.width+"px",height:box.height+"px",
  });
 }
 #syncSelection(){
  if(!this.#selectionOverlay)return;
  const selection=window.getSelection();
  const rects=this.#active?selectionGeometry(this,selection):[];
  updateSelectionIndicator(this.#selectionOverlay,rects);
  const selectedLength=rects.length>0 && selection && selection.rangeCount===1
   ? selection.getRangeAt(0).toString().length:0;
  this.dispatchEvent(new CustomEvent("secure-selection-change",{detail:{
   native:true,highlightRects:rects.length,selectedCharacters:selectedLength,
   visibleIndicatorIsCapturable:true
  }}));
 }
 #block(reason){
  this.#active=false;
  this.#assetDimensions=null;
  this.dataset.secureState="blocked";
  if(this.#video)this.#video.style.opacity="0";
  this.#syncSelection();
  const old=this.#player;
  this.#player=null;
  if(old)void old.destroy().catch(()=>{});
  this.dispatchEvent(new CustomEvent("secure-state-change",{
   detail:{state:"blocked",reason}
  }));
 }
 async #load(){
  const controller=this.#controller;
  let handle=null;
  try{
   const assetId=this.getAttribute("data-asset-id");
   if(!validAssetId(assetId))throw Error("Missing or invalid encrypted asset identifier.");
   const sourceSha256=this.getAttribute("data-source-sha256");
   if(!/^[a-f0-9]{64}$/i.test(sourceSha256||""))
    throw Error("Missing SHA256 binding for encrypted DOM snapshot.");
   if(!playbackAdapter)throw Error("No protected asset playback adapter configured.");
   handle=await playbackAdapter(this.#video,controller.signal,assetId,sourceSha256);
   if(controller.signal.aborted||this.#controller!==controller){
    await handle?.destroy();
    return;
   }
   const box=this.getBoundingClientRect();
   if(!Number.isFinite(handle?.width)||!Number.isFinite(handle?.height)||
      handle.width<=0||handle.height<=0||!dimensionsMatch(box,handle))
    throw Error("Protected DOM dimensions do not match the encrypted asset.");
   if(typeof handle?.destroy!=="function"||typeof handle?.drm!=="string")
    throw Error("Invalid DRM playback handle.");
   this.#player=handle;
   this.#assetDimensions={width:handle.width,height:handle.height};
   this.#active=true;
   this.dataset.secureState="playing";
   this.#syncRect();
   if(!this.#active)return;
   this.#video.style.opacity="1";
   this.#syncSelection();
   this.dispatchEvent(new CustomEvent("secure-state-change",{detail:{
    state:"playing",drm:handle.drm,source:"encrypted-dom-snapshot"
   }}));
  }catch(error){
   if(handle&&handle!==this.#player)await handle.destroy?.().catch(()=>{});
   if(controller.signal.aborted||this.#controller!==controller)return;
   this.#block(error?.message||"Encrypted playback unavailable.");
  }
 }
}
export function registerSecureDiv(adapter){
 if(typeof window==="undefined"||typeof customElements==="undefined")
  throw Error("SecureDiv requires a browser environment.");
 if(typeof adapter!=="function")throw TypeError("An encrypted playback adapter is required.");
 if(installedAdapter&&installedAdapter!==adapter)
  throw Error("SecureDiv playback adapter cannot be replaced after registration.");
 const existing=customElements.get("secure-div");
 if(existing&&existing!==SecureDiv)throw Error("Another secure-div element is registered.");
 playbackAdapter=adapter;
 installedAdapter=adapter;
 if(!document.querySelector('style[data-secure-div-guard]')){
  const guard=document.createElement("style");
  guard.setAttribute("data-secure-div-guard","");
  guard.textContent="secure-div{opacity:0!important;display:block}";
  document.head.appendChild(guard);
 }
 if(!existing)customElements.define("secure-div",SecureDiv);
}
