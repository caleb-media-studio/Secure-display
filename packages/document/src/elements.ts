import {
  documentSecureContextError,
  type SyntheticDocument, type Page, type Selection, validateDocument,
  hitTest, select, highlights, caret, limits,
} from "./geometry.js";
import {
  startProtectedPage, type DRMPlayer, type PlayerFactory,
  type PlayerSetup, type PageSession,
} from "./playback.js";

interface PageView {
  wrapper:HTMLDivElement;
  surface:HTMLDivElement;
  overlay:HTMLDivElement;
  video:HTMLVideoElement;
  state:HTMLSpanElement;
  controller?:AbortController;
  session?:PageSession;
  loading:boolean;
  ready:boolean;
}
export interface DocumentAdapters {
  /** Server authenticates every opaque ID; must not return plaintext. */
  resolveDocument:(assetId:string,signal:AbortSignal)=>Promise<unknown>;
  createPlayer:PlayerFactory;
  /** Optional DRM license request filter; keep vendor secrets on the server. */
  preparePlayer?:PlayerSetup;
}
export const DOCUMENT_TAG="secure-document";

/**
 * Protected document surface built from licensed video and geometry overlays.
 * Synthetic media ONLY. In particular, copying protected text is unsupported
 * and this does not certify screenshot exclusion on untested capture paths.
 */
export function registerSecureDocumentElement(adapters:DocumentAdapters):void {
  if(typeof customElements==="undefined" || typeof HTMLElement==="undefined")
    throw Error("Secure Document requires a browser.");
  if(customElements.get(DOCUMENT_TAG)) throw Error("Secure Document already registered.");
  if(typeof adapters.resolveDocument!=="function" || typeof adapters.createPlayer!=="function")
    throw Error("Document and DRM player adapters are required.");

  class SecureDocumentElement extends HTMLElement {
    static get observedAttributes(){return ["asset-id","zoom"];}
    private manifest?:SyntheticDocument;
    private views:PageView[]=[];
    private observer?:IntersectionObserver;
    private sessionController?:AbortController;
    private requestGeneration=0;
    private zoomValue=1;
    private anchor?:number;
    private focusIndex?:number;
    private dragging=false;
    private readonly viewport:HTMLDivElement;
    private readonly pagesNode:HTMLDivElement;
    private readonly statusNode:HTMLParagraphElement;
    private readonly zoomLabel:HTMLSpanElement;

    constructor() {
      super();
      const root=this.attachShadow({mode:"open"});
      const style=document.createElement("style");
      style.textContent=`
        :host{display:block;contain:layout style;font-family:inherit;color:inherit}
        .toolbar{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin:.5rem 0}
        button{border:1px solid currentColor;border-radius:.4rem;background:transparent;
          color:inherit;padding:.35rem .6rem;cursor:pointer}
        button:focus-visible,.viewport:focus-visible{outline:2px solid #5fa6ee}
        .viewport{max-height:min(75vh,900px);overflow:auto;overscroll-behavior:contain;
          padding:16px;background:#111827;border-radius:10px;user-select:none}
        .pages{display:flex;flex-direction:column;align-items:center;gap:20px}
        .page{position:relative;flex:none;background:#030712;box-shadow:0 8px 26px #0008;
          overflow:hidden}
        .surface{position:absolute;inset:0;transform-origin:0 0;touch-action:pan-y;cursor:text}
        video{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;
          pointer-events:none}
        video[hidden]{display:none!important}
        .highlights{position:absolute;inset:0;pointer-events:none;z-index:2}
        .highlight{position:absolute;background:rgba(83,147,249,.36);
          outline:1px solid rgba(93,175,255,.48)}
        .page-status{position:absolute;top:1em;left:1em;right:1em;z-index:3;
          color:white;background:#182235e8;padding:.6em;border-radius:.4em;font-size:13px}
        .page-status[hidden]{display:none}
        .status{font-size:.85rem;line-height:1.4}
      `;
      const toolbar=document.createElement("div");
      toolbar.className="toolbar";
      const out=document.createElement("button");
      out.textContent="−";
      out.type="button";
      out.setAttribute("aria-label","Zoom out");
      const zoomText=document.createElement("span");
      zoomText.textContent="100%";
      this.zoomLabel=zoomText;
      const inside=document.createElement("button");
      inside.textContent="+";
      inside.type="button";
      inside.setAttribute("aria-label","Zoom in");
      toolbar.append(out,zoomText,inside);
      out.addEventListener("click",()=>this.setZoom(this.zoomValue-.25));
      inside.addEventListener("click",()=>this.setZoom(this.zoomValue+.25));
      const viewport=document.createElement("div");
      viewport.className="viewport";
      viewport.tabIndex=0;
      viewport.setAttribute("role","region");
      viewport.setAttribute("aria-label","Protected synthetic document. Accessible document text is not available.");
      this.viewport=viewport;
      const pages=document.createElement("div");
      pages.className="pages";
      this.pagesNode=pages;
      viewport.append(pages);
      const status=document.createElement("p");
      status.className="status";
      status.setAttribute("role","status");
      status.textContent="Synthetic DRM document is not loaded.";
      this.statusNode=status;
      root.append(style,toolbar,viewport,status);
      viewport.addEventListener("pointerdown",event=>this.pointerDown(event));
      viewport.addEventListener("pointermove",event=>this.pointerMove(event));
      viewport.addEventListener("pointerup",event=>this.pointerUp(event));
      viewport.addEventListener("pointercancel",event=>this.pointerUp(event));
      viewport.addEventListener("keydown",event=>this.keyboard(event));
      // No native plaintext selection/clipboard. Highlights are geometric only.
      for(const name of ["copy","cut","dragstart","selectstart"]) {
        root.addEventListener(name,event=>event.preventDefault());
      }
      viewport.addEventListener("scroll",()=>this.reconcileVisiblePages(),{passive:true});
    }
    connectedCallback() {void this.load();}
    disconnectedCallback() {this.teardown();}
    attributeChangedCallback(name:string,oldValue:string|null,newValue:string|null) {
      if(oldValue===newValue || !this.isConnected) return;
      if(name==="zoom") this.setZoom(Number(newValue||1));
      else void this.load();
    }
    private status(value:string) {this.statusNode.textContent=value;}
    private teardown() {
      ++this.requestGeneration;
      this.sessionController?.abort();
      this.sessionController=undefined;
      this.observer?.disconnect();
      this.observer=undefined;
      for(const view of this.views) this.stopPage(view);
      this.views=[];
      this.manifest=undefined;
      this.anchor=undefined;
      this.focusIndex=undefined;
      this.pagesNode.replaceChildren();
      this.setAttribute("data-state","blocked");
    }
    private setZoom(next:number) {
      if(!Number.isFinite(next)) next=1;
      this.zoomValue=Math.max(.5,Math.min(2,Math.round(next*4)/4));
      this.zoomLabel.textContent=Math.round(this.zoomValue*100)+"%";
      this.views.forEach((view,index)=>{
        const page=this.manifest?.pages[index];
        if(!page) return;
        view.wrapper.style.width=page.width*this.zoomValue+"px";
        view.wrapper.style.height=page.height*this.zoomValue+"px";
        view.surface.style.transform="scale("+this.zoomValue+")";
      });
      this.reconcileVisiblePages();
    }
    private async load() {
      this.teardown();
      const generation=this.requestGeneration;
      if(this.childNodes.length) {
        this.status("Plaintext children are forbidden; supply an opaque asset-id.");
        return;
      }
      const id=this.getAttribute("asset-id");
      if(!id || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
        this.status("Missing or invalid asset-id.");
        return;
      }
      const contextError=documentSecureContextError(location.href,globalThis.isSecureContext===true);
      if(contextError) {
        this.setAttribute("data-reason","insecure-context");
        this.status(contextError);
        return;
      }
      this.removeAttribute("data-reason");
      const controller=new AbortController();
      this.sessionController=controller;
      this.status("Checking synthetic DRM document...");
      try {
        const raw=await adapters.resolveDocument(id,controller.signal);
        if(controller.signal.aborted || generation!==this.requestGeneration) return;
        this.manifest=validateDocument(raw,location.href);
        this.zoomValue=1;
        this.setZoom(Number(this.getAttribute("zoom")||1));
        this.buildPages();
        this.status("Synthetic-only DRM document. Text selection highlights are geometry only; copy is disabled.");
        if(typeof IntersectionObserver==="function") {
          this.observer=new IntersectionObserver(entries=>{
            for(const entry of entries) {
              const view=this.views.find(v=>v.wrapper===entry.target);
              if(!view) continue;
              if(entry.isIntersecting) void this.startPage(view);
              else this.stopPage(view);
            }
          },{root:this.viewport,rootMargin:"150px 0px"});
          for(const view of this.views) this.observer.observe(view.wrapper);
        } else this.reconcileVisiblePages();
      } catch {
        if(generation===this.requestGeneration && !controller.signal.aborted) {
          this.manifest=undefined;
          this.status("Protected document unavailable or manifest rejected.");
          this.setAttribute("data-state","blocked");
        }
      }
    }
    private buildPages() {
      if(!this.manifest) return;
      this.views=this.manifest.pages.map((page,index)=>{
        const wrapper=document.createElement("div");
        wrapper.className="page";
        wrapper.dataset.page=String(index);
        const surface=document.createElement("div");
        surface.className="surface";
        surface.dataset.page=String(index);
        surface.style.width=page.width+"px";
        surface.style.height=page.height+"px";
        const video=document.createElement("video");
        video.hidden=true;
        video.playsInline=true;
        video.setAttribute("aria-hidden","true");
        const overlay=document.createElement("div");
        overlay.className="highlights";
        const state=document.createElement("span");
        state.className="page-status";
        state.textContent="Scroll here to load encrypted page.";
        surface.append(video,overlay,state);
        wrapper.append(surface);
        this.pagesNode.append(wrapper);
        return {wrapper,surface,overlay,video,state,loading:false,ready:false};
      });
      this.setZoom(Number(this.getAttribute("zoom")||1));
    }
    private stopPage(view:PageView) {
      view.controller?.abort();
      view.controller=undefined;
      view.loading=false;
      view.ready=false;
      view.video.hidden=true;
      const old=view.session;
      view.session=undefined;
      if(old) void old.destroy().catch(()=>undefined);
      view.state.hidden=false;
      view.state.textContent="Encrypted page not loaded.";
    }
    private async startPage(view:PageView) {
      if(view.loading || view.session || !this.manifest || !this.sessionController) return;
      const index=this.views.indexOf(view);
      const page=this.manifest.pages[index];
      if(!page) return;
      // A single video/CDM per page. Only visible pages are decoded.
      const controller=new AbortController();
      const parent=this.sessionController;
      parent.signal.addEventListener("abort",()=>controller.abort(),{once:true});
      view.controller=controller;
      view.loading=true;
      view.state.textContent="Establishing licensed DRM...";
      try {
        const session=await startProtectedPage(
          view.video,page.media,adapters.createPlayer,adapters.preparePlayer,
          controller.signal,state=>{
            if(controller.signal.aborted || this.views[index]!==view) return;
            if(state==="blocked") {
              view.ready=false;
              view.video.hidden=true;
              view.state.hidden=false;
              view.state.textContent="DRM playback restricted.";
            } else if(state==="playing") {
              view.ready=true;
              view.state.hidden=true;
              this.setAttribute("data-state","synthetic-test");
              this.status("Playing synthetic DRM document; screenshot exclusion remains unverified.");
            }
          }
        );
        if(controller.signal.aborted || this.views[index]!==view) await session.destroy();
        else view.session=session;
      } catch {
        if(!controller.signal.aborted && this.views[index]===view) {
          view.state.hidden=false;
          view.state.textContent="Licensed DRM playback unavailable.";
        }
      } finally {view.loading=false;}
    }
    private reconcileVisiblePages() {
      if(!this.manifest || this.observer) return;
      const viewportRect=this.viewport.getBoundingClientRect();
      for(const view of this.views) {
        const rect=view.wrapper.getBoundingClientRect();
        const visible=rect.bottom>=viewportRect.top-150 && rect.top<=viewportRect.bottom+150;
        if(visible) void this.startPage(view);
        else this.stopPage(view);
      }
    }
    private pageAt(clientX:number,clientY:number) {
      let bestIndex=-1;
      let distance=Number.POSITIVE_INFINITY;
      this.views.forEach((view,index)=>{
        if(!view.ready) return;
        const r=view.surface.getBoundingClientRect();
        const dx=Math.max(r.left-clientX,0,clientX-r.right);
        const dy=Math.max(r.top-clientY,0,clientY-r.bottom);
        const d=dx*dx+dy*dy;
        if(d<distance) {distance=d;bestIndex=index;}
      });
      if(bestIndex<0 || !this.manifest) return undefined;
      const view=this.views[bestIndex]!;
      const rect=view.surface.getBoundingClientRect();
      const page=this.manifest.pages[bestIndex]!;
      return {page:bestIndex, x:(clientX-rect.left)/this.zoomValue,
        y:(clientY-rect.top)/this.zoomValue};
    }
    private pointerDown(event:PointerEvent) {
      if(event.button!==0 || !this.manifest) return;
      const point=this.pageAt(event.clientX,event.clientY);
      if(!point) return;
      this.anchor=hitTest(this.manifest,point.page,point.x,point.y);
      this.focusIndex=this.anchor;
      this.dragging=true;
      this.viewport.focus();
      this.viewport.setPointerCapture(event.pointerId);
      this.renderSelection();
      event.preventDefault();
    }
    private pointerMove(event:PointerEvent) {
      if(!this.dragging || !this.manifest) return;
      const point=this.pageAt(event.clientX,event.clientY);
      if(!point) return;
      this.focusIndex=hitTest(this.manifest,point.page,point.x,point.y);
      this.renderSelection();
    }
    private pointerUp(event:PointerEvent) {
      this.dragging=false;
      if(this.viewport.hasPointerCapture(event.pointerId))
        this.viewport.releasePointerCapture(event.pointerId);
    }
    private keyboard(event:KeyboardEvent) {
      if(!this.manifest) return;
      const supported=["ArrowLeft","ArrowRight","Home","End","Escape"];
      if(!supported.includes(event.key) && !(event.key.toLowerCase()==="a" && (event.metaKey||event.ctrlKey))) return;
      event.preventDefault();
      const {min,max}=limits(this.manifest);
      if(event.key==="Escape") {
        this.anchor=undefined;this.focusIndex=undefined;this.renderSelection();return;
      }
      if(event.key.toLowerCase()==="a" && (event.metaKey||event.ctrlKey)) {
        this.anchor=min;this.focusIndex=max;
      } else {
        let focus=this.focusIndex??min;
        if(event.key==="ArrowLeft") focus=caret(this.manifest,focus-1);
        if(event.key==="ArrowRight") focus=caret(this.manifest,focus+1);
        if(event.key==="Home") focus=min;
        if(event.key==="End") focus=max;
        if(!event.shiftKey || this.anchor===undefined) this.anchor=focus;
        this.focusIndex=focus;
      }
      this.renderSelection();
    }
    private renderSelection() {
      if(!this.manifest) return;
      const range:Selection=this.anchor===undefined || this.focusIndex===undefined
        ? {start:0,end:0,collapsed:true}
        : select(this.manifest,this.anchor,this.focusIndex);
      const rects=highlights(this.manifest,range);
      this.views.forEach((view,index)=>{
        const nodes=rects.filter(rect=>rect.page===index).map(rect=>{
          const node=document.createElement("div");
          node.className="highlight";
          node.style.left=rect.x+"px";
          node.style.top=rect.y+"px";
          node.style.width=rect.width+"px";
          node.style.height=rect.height+"px";
          return node;
        });
        view.overlay.replaceChildren(...nodes);
      });
      this.dispatchEvent(new CustomEvent("secure-selection-change",{
        bubbles:true,composed:true,detail:{...range},
      }));
    }
  }
  customElements.define(DOCUMENT_TAG,SecureDocumentElement);
}
