import {startEncryptedVideo} from "./drm-player.js";
import {selectionGeometry,updateSelectionIndicator} from "./selection-geometry.js";

/**
 * Research-only custom element. Keeps the *real children* in the light DOM:
 * CSS, event listeners, tabbing and browser native layout remain theirs.
 * Only visible pixels are substituted with packaged DRM video. The host
 * remains 0 opacity for both successful and failed playback to prevent
 * nonprotected pixels from appearing in captures.
 */
export class SecureDiv extends HTMLElement {
 #player=null;
 #video=null;
 #selectionOverlay=null;
 #controller=null;
 #observer=null;
 #resize=null;
 #position=()=>{this.#syncRect();this.#syncSelection();};
 #selectionUpdate=()=>this.#syncSelection();
 #active=false;

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
 }
 #syncRect(){
  if(!this.#video)return;
  const box=this.getBoundingClientRect();
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
  this.dataset.secureState="blocked";
  if(this.#video)this.#video.style.opacity="0";
  this.#syncSelection();
  this.dispatchEvent(new CustomEvent("secure-state-change",{
   detail:{state:"blocked",reason}
  }));
 }
 async #load(){
  try{
   if(this.getAttribute("data-asset-id")!=="demo-card")
     throw Error("Unknown synthetic asset identifier.");
   const {player,provider,meta}=await startEncryptedVideo(
     this.#video,this.#controller.signal,this.getAttribute("data-source-sha256"));
   this.#player=player;
   const box=this.getBoundingClientRect();
   if(box.width<=0||box.height<=0)throw Error("Protected DOM element has no visible layout.");
   // V1 requires a fixed aspect ratio to avoid style mismatch.
   if(Math.abs(box.width/box.height-meta.width/meta.height)>0.008)
     throw Error("The DOM card aspect ratio changed since packaging. Rebuild to protect it.");
   if(this.#controller.signal.aborted)return;
   this.#active=true;
   this.dataset.secureState="playing";
   this.#syncRect();
   this.#video.style.opacity="1";
   this.#syncSelection();
   this.dispatchEvent(new CustomEvent("secure-state-change",{detail:{
    state:"playing",drm:provider.type,source:"encrypted-dom-snapshot"
   }}));
  }catch(error){
   if(this.#controller?.signal.aborted)return;
   this.#active=false;
   this.dataset.secureState="blocked";
   if(this.#video)this.#video.style.opacity="0";
   this.dispatchEvent(new CustomEvent("secure-state-change",{detail:{
    state:"blocked",reason:error?.message||"Encrypted playback unavailable."
   }}));
  }
 }
}
export function registerSecureDiv(){
 if(!customElements.get("secure-div"))customElements.define("secure-div",SecureDiv);
}
