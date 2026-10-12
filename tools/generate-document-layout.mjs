#!/usr/bin/env node
/**
 * Layout metadata companion for the EXISTING unencrypted synthetic text clip.
 * This is NOT a DRM packager. Only fake test strings appear in this local tool;
 * output contains positions and offsets ONLY, never words.
 */
import {writeFile,mkdir} from "node:fs/promises";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const dir=resolve(root,"fixtures/generated");
const lines=[
  {label:"SYNTHETIC TEST ONLY",y:105,scale:4},
  {label:"EXAMPLE ID 000000",y:165,scale:3},
  {label:"NOT DRM ENCRYPTED - CAPTURABLE",y:285,scale:2},
];
const width=640,height=360;
let offset=0;
const geometry=lines.map(({label,y,scale})=>{
  const left=Math.floor((width-label.length*6*scale+scale)/2);
  const glyphs=Array.from(label,(_char,i)=>({
    index:offset+i,x:left+i*6*scale,width:5*scale,
  }));
  offset+=glyphs.length;
  return {y,height:7*scale,glyphs};
});
await mkdir(dir,{recursive:true});
await writeFile(resolve(dir,"document-geometry.json"),JSON.stringify({
  page:{id:"synthetic-page-1",width,height,lines:geometry},
  warning:"GEOMETRY ONLY. Clear video must be DRM packaged before playback. Do not send plaintext in client manifest.",
},null,2)+"\n");
console.log("Generated geometry-only layout:",resolve(dir,"document-geometry.json"));
console.log("No playable DRM manifest generated; encrypted HLS/DASH and licensed media are still required.");
