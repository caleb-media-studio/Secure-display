/** Geometry-only document model: never carries plaintext or printable glyphs. */
/** Clear user-facing cause for insecure DRM browser contexts without leaking URLs. */
export function documentSecureContextError(pageUrl:string,secure:boolean):string|undefined {
  if(secure) return undefined;
  try {
    const origin=new URL(pageUrl);
    if(origin.protocol==="http:" &&
       !["localhost","127.0.0.1","[::1]"].includes(origin.hostname)) {
      return "DRM blocked: HTTP on a LAN address is not a secure context. Run bun run network:cert, restart Vite, and open the HTTPS Network URL on a device that trusts the development CA.";
    }
  } catch {/* A malformed origin must never allow DRM playback. */}
  return "DRM blocked: this browser does not trust the secure context. Use HTTPS with a trusted development certificate.";
}

export interface Glyph { index:number; x:number; width:number }
export interface Line { y:number; height:number; glyphs:readonly Glyph[] }
export interface MediaDescriptor {
  keySystem:"com.apple.fps"|"com.widevine.alpha";
  format:"hls"|"dash";
  manifestUrl:string;
  licenseUrl:string;
  certificateUrl?:string;
}
export interface Page { id:string; width:number; height:number; lines:readonly Line[]; media:MediaDescriptor }
export interface SyntheticDocument { version:1; classification:"synthetic-test-only"; pages:readonly Page[] }
export interface Selection {start:number;end:number;collapsed:boolean}
export interface Highlight {page:number;x:number;y:number;width:number;height:number}
const allowed=(value:unknown,fields:string[]):value is Record<string,unknown> =>
  !!value && typeof value==="object" && !Array.isArray(value) &&
  Object.keys(value).every(key=>fields.includes(key));
const num=(v:unknown,min:number,max:number):v is number =>
  typeof v==="number" && Number.isFinite(v) && v>=min && v<=max;
const urlOk=(value:unknown,base:string) => {
  if(typeof value!=="string" || value.length>2048) return false;
  try {
    const u=new URL(value,base);
    return !u.username && !u.password &&
      (u.protocol==="https:" || (u.protocol==="http:" &&
      ["localhost","127.0.0.1","[::1]"].includes(u.hostname)));
  } catch{return false;}
};
/** Fail closed for unknown keys, including text/content/HTML and unsupported DRM. */
export function validateDocument(input:unknown,base="https://example.test/"):SyntheticDocument {
  if(!allowed(input,["version","classification","pages"]) ||
    input.version!==1 || input.classification!=="synthetic-test-only" ||
    !Array.isArray(input.pages) || input.pages.length<1 || input.pages.length>20)
    throw Error("Only synthetic test documents are supported; no plaintext fields.");
  let previous=-1;
  for(const page of input.pages) {
    if(!allowed(page,["id","width","height","lines","media"]) ||
      typeof page.id!=="string" || !/^[A-Za-z0-9_-]{1,128}$/.test(page.id) ||
      !num(page.width,64,8192) || !num(page.height,64,8192) ||
      !Array.isArray(page.lines) || page.lines.length<1 || page.lines.length>500)
      throw Error("Invalid protected page.");
    const media=page.media;
    if(!allowed(media,["keySystem","format","manifestUrl","licenseUrl","certificateUrl"]) ||
       !["com.apple.fps","com.widevine.alpha"].includes(String(media.keySystem)) ||
       !["hls","dash"].includes(String(media.format)) ||
       (media.keySystem==="com.apple.fps" && (media.format!=="hls" || !urlOk(media.certificateUrl,base))) ||
       !urlOk(media.manifestUrl,base) || !urlOk(media.licenseUrl,base) ||
       (media.certificateUrl!==undefined && !urlOk(media.certificateUrl,base)))
       throw Error("Real DRM media endpoints are required.");
    const u=new URL(media.manifestUrl as string,base);
    if(!(media.format==="hls"?u.pathname.endsWith(".m3u8"):u.pathname.endsWith(".mpd")))
       throw Error("Media format mismatch.");
    let lastBottom=-1;
    for(const line of page.lines) {
      if(!allowed(line,["y","height","glyphs"]) ||
        !num(line.y,0,page.height) || !num(line.height,1,page.height) ||
        line.y+line.height>page.height || line.y<lastBottom ||
        !Array.isArray(line.glyphs) || !line.glyphs.length || line.glyphs.length>2000)
        throw Error("Invalid line layout.");
      lastBottom=line.y+line.height;
      let right=-1;
      for(const glyph of line.glyphs) {
        if(!allowed(glyph,["index","x","width"]) ||
          !Number.isSafeInteger(glyph.index) || glyph.index!==previous+1 ||
          !num(glyph.x,0,page.width) || !num(glyph.width,0.001,page.width) ||
          glyph.x<right || glyph.x+glyph.width>page.width)
          throw Error("Invalid ordered glyph geometry.");
        previous=glyph.index;
        right=glyph.x+glyph.width;
      }
    }
  }
  return input as unknown as SyntheticDocument;
}
export function limits(doc:SyntheticDocument) {
  const first=doc.pages[0]!.lines[0]!.glyphs[0]!.index;
  const page=doc.pages[doc.pages.length-1]!;
  const line=page.lines[page.lines.length-1]!;
  return {min:first,max:line.glyphs[line.glyphs.length-1]!.index+1};
}
export function caret(doc:SyntheticDocument,index:number) {
  const {min,max}=limits(doc);
  return Math.max(min,Math.min(max,Math.round(index)));
}
export function select(doc:SyntheticDocument,anchor:number,focus:number):Selection {
  const a=caret(doc,anchor),b=caret(doc,focus);
  return {start:Math.min(a,b),end:Math.max(a,b),collapsed:a===b};
}
export function hitTest(doc:SyntheticDocument,pageIndex:number,x:number,y:number) {
  const page=doc.pages[pageIndex];
  if(!page) throw Error("Missing page.");
  const line=page.lines.reduce((best,next)=>
    Math.abs(next.y+next.height/2-y)<Math.abs(best.y+best.height/2-y)?next:best);
  const first=line.glyphs[0]!,last=line.glyphs[line.glyphs.length-1]!;
  if(x<=first.x) return first.index;
  for(const glyph of line.glyphs) if(x<glyph.x+glyph.width/2) return glyph.index;
  return last.index+1;
}
export function highlights(doc:SyntheticDocument,range:Selection):Highlight[] {
  if(range.collapsed) return [];
  const result:Highlight[]=[];
  doc.pages.forEach((page,index)=>{
    for(const line of page.lines) {
      const chosen=line.glyphs.filter(g=>g.index>=range.start && g.index<range.end);
      if(chosen.length) {
        const first=chosen[0]!,last=chosen[chosen.length-1]!;
        result.push({page:index,x:first.x,y:line.y,
          width:last.x+last.width-first.x,height:line.height});
      }
    }
  });
  return result;
}
