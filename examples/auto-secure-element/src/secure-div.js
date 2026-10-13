import {startEncryptedVideo} from "./drm-player.js";

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
 #controller=null;
 #observer=null;
 #resize=null;
 #position=()=>this.#syncRect();
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
  this.#video.style.cssText=[
    "position:fixed","z-index:2000000000","pointer-events:none",
    "opacity:0","background:transparent","display:block","margin:0",
    "padding:0","border:0","object-fit:fill","overflow:hidden"
  ].join(";");
  document.body.appendChild(this.#video);
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
   this.dispatchEvent(new CustomEvent("secure-state-change",{
    detail:{state:"stale",reason:"DOM content changed; regenerate the encrypted asset."}
   }));
  });
  this.#observer.observe(this,{childList:true,subtree:true,characterData:true});
  void this.#load();
 }
 disconnectedCallback(){
  this.#controller?.abort();
  this.#observer?.disconnect();
  this.#resize?.disconnect();
  removeEventListener("resize",this.#position);
  removeEventListener("scroll",this.#position,true);
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
 async #load(){
  try{
   const {player,provider,meta}=await startEncryptedVideo(this.#video,this.#controller.signal);
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
