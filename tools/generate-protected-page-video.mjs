#!/usr/bin/env node
/**
 * Synthetic black DRM layer experiment. The clear PPM/MP4 is a local build
 * intermediate only; its pixels must be packaged into encrypted media.
 * No HTML canvas or font dependency is used for the browser.
 */
import {spawnSync} from "node:child_process";
import {mkdir,writeFile,rm} from "node:fs/promises";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";

export const TEST_SENTENCE="This page is protected by Security Display GitHub repo, and this is a test.";
export const PAGE_WIDTH=1280, PAGE_HEIGHT=720;
export const BUTTON_BOX=Object.freeze({x:482,y:506,width:316,height:74});
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const OUT=resolve(ROOT,"fixtures/generated");
const PPM=resolve(OUT,"protected-page.ppm");
const MP4=resolve(OUT,"protected-page-clear.mp4");
// Handwritten fixed 5x7 font. Lowercase is represented as lowercase glyphs,
// not uppercased in the rasterizer, so the supplied sentence keeps its case.
const rows={
 " ":"00000/00000/00000/00000/00000/00000/00000",
 ".":"00000/00000/00000/00000/00000/01100/01100",
 ",":"00000/00000/00000/00000/01100/01100/00100",
 "-":"00000/00000/00000/11111/00000/00000/00000",
 ":":"00000/01100/01100/00000/01100/01100/00000",
 A:"01110/10001/10001/11111/10001/10001/10001",
 B:"11110/10001/10001/11110/10001/10001/11110",
 C:"01111/10000/10000/10000/10000/10000/01111",
 D:"11110/10001/10001/10001/10001/10001/11110",
 E:"11111/10000/10000/11110/10000/10000/11111",
 F:"11111/10000/10000/11110/10000/10000/10000",
 G:"01111/10000/10000/10111/10001/10001/01111",
 H:"10001/10001/10001/11111/10001/10001/10001",
 I:"11111/00100/00100/00100/00100/00100/11111",
 J:"00111/00010/00010/00010/10010/10010/01100",
 K:"10001/10010/10100/11000/10100/10010/10001",
 L:"10000/10000/10000/10000/10000/10000/11111",
 M:"10001/11011/10101/10101/10001/10001/10001",
 N:"10001/11001/10101/10011/10001/10001/10001",
 O:"01110/10001/10001/10001/10001/10001/01110",
 P:"11110/10001/10001/11110/10000/10000/10000",
 Q:"01110/10001/10001/10001/10101/10010/01101",
 R:"11110/10001/10001/11110/10100/10010/10001",
 S:"01111/10000/10000/01110/00001/00001/11110",
 T:"11111/00100/00100/00100/00100/00100/00100",
 U:"10001/10001/10001/10001/10001/10001/01110",
 V:"10001/10001/10001/10001/10001/01010/00100",
 W:"10001/10001/10001/10101/10101/10101/01010",
 X:"10001/10001/01010/00100/01010/10001/10001",
 Y:"10001/10001/01010/00100/00100/00100/00100",
 Z:"11111/00001/00010/00100/01000/10000/11111",
 a:"00000/00000/01110/00001/01111/10001/01111",
 b:"10000/10000/10110/11001/10001/10001/11110",
 c:"00000/00000/01111/10000/10000/10000/01111",
 d:"00001/00001/01101/10011/10001/10001/01111",
 e:"00000/00000/01110/10001/11111/10000/01110",
 f:"00110/01001/01000/11100/01000/01000/01000",
 g:"00000/01111/10001/10001/01111/00001/01110",
 h:"10000/10000/10110/11001/10001/10001/10001",
 i:"00100/00000/01100/00100/00100/00100/01110",
 j:"00010/00000/00110/00010/00010/10010/01100",
 k:"10000/10000/10010/10100/11000/10100/10010",
 l:"01100/00100/00100/00100/00100/00100/01110",
 m:"00000/00000/11010/10101/10101/10101/10101",
 n:"00000/00000/10110/11001/10001/10001/10001",
 o:"00000/00000/01110/10001/10001/10001/01110",
 p:"00000/00000/11110/10001/11110/10000/10000",
 q:"00000/00000/01111/10001/01111/00001/00001",
 r:"00000/00000/10110/11001/10000/10000/10000",
 s:"00000/00000/01111/10000/01110/00001/11110",
 t:"01000/01000/11100/01000/01000/01001/00110",
 u:"00000/00000/10001/10001/10001/10011/01101",
 v:"00000/00000/10001/10001/10001/01010/00100",
 w:"00000/00000/10001/10001/10101/10101/01010",
 x:"00000/00000/10001/01010/00100/01010/10001",
 y:"00000/00000/10001/10001/01111/00001/01110",
 z:"00000/00000/11111/00010/00100/01000/11111",
};
const FONT=Object.fromEntries(Object.entries(rows).map(([char,v])=>[char,v.split("/")]));
export function wrapWords(message,maxChars=29) {
 const words=message.split(" ");
 const lines=[];let line="";
 for(const word of words) {
   if(word.length>maxChars) throw Error("Word too long for protected page");
   const next=line?line+" "+word:word;
   if(next.length>maxChars && line) {lines.push(line);line=word;}
   else line=next;
 }
 if(line) lines.push(line);
 if(lines.join(" ")!==message) throw Error("Protected sentence was changed.");
 return lines;
}
export function assertSupportedGlyphs(message=TEST_SENTENCE) {
 for(const char of message) if(!FONT[char]) throw Error("Missing bitmap glyph: "+char);
}
const width=PAGE_WIDTH,height=PAGE_HEIGHT;
const rgb=Buffer.alloc(width*height*3);
function pixel(x,y,color) {
 if(x<0||y<0||x>=width||y>=height)return;
 const j=(y*width+x)*3;
 rgb[j]=color[0];rgb[j+1]=color[1];rgb[j+2]=color[2];
}
function rect(x,y,w,h,color) {
 const x0=Math.max(0,Math.floor(x)),y0=Math.max(0,Math.floor(y));
 const x1=Math.min(width,Math.ceil(x+w)),y1=Math.min(height,Math.ceil(y+h));
 for(let yy=y0;yy<y1;yy++) {
   for(let xx=x0;xx<x1;xx++) pixel(xx,yy,color);
 }
}
function label(message,x,y,scale,color) {
 assertSupportedGlyphs(message);
 for(let i=0;i<message.length;i++){
  const glyph=FONT[message[i]];
  for(let gy=0;gy<7;gy++)for(let gx=0;gx<5;gx++) {
    if(glyph[gy][gx]!=="1")continue;
    rect(x+i*6*scale+gx*scale,y+gy*scale,scale,scale,color);
  }
 }
}
function centered(message,y,scale,color) {
 label(message,Math.round((width-message.length*6*scale+scale)/2),y,scale,color);
}
// Blank media isolates DRM protected compositing from the actual DOM.
// All meaningful text and controls remain in the regular HTML underneath.
export function rasterizeBlack() {
 return Buffer.alloc(PAGE_WIDTH*PAGE_HEIGHT*3,0);
}
export function rasterize() {
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const shade=Math.floor(10+13*x/width+5*y/height);
  pixel(x,y,[shade,shade+8,shade+19]);
 }
 rect(0,0,width,93,[15,26,44]);
 rect(80,25,11,41,[88,232,192]);
 label("SECURE DISPLAY",113,30,4,[225,241,252]);
 rect(76,145,1128,478,[28,42,66]);
 rect(81,150,1118,468,[18,29,48]);
 rect(121,192,178,35,[40,94,90]);
 label("DRM PROTECTED",130,199,3,[139,244,217]);
 const wrapped=wrapWords(TEST_SENTENCE,29);
 if(wrapped.length!==3) throw Error("Expected exactly three lines of protected sample text");
 for(let i=0;i<wrapped.length;i++)centered(wrapped[i],264+i*69,5,[237,246,255]);
 const b=BUTTON_BOX;
 rect(b.x,b.y,b.width,b.height,[70,212,171]);
 rect(b.x+3,b.y+3,b.width-6,b.height-6,[88,229,186]);
 centered("CLICK HERE",b.y+24,4,[11,30,39]);
 centered("SYNTHETIC PAGE TEST",660,3,[131,154,184]);
 return rgb;
}
async function main(){
 // Default fixture is a solid black licensed video. '--graphic' is an
 // explicit older diagnostic, NOT the overlay screenshot experiment.
 const graphic=process.argv.includes("--graphic");
 const image=graphic?rasterize():rasterizeBlack();
 await mkdir(OUT,{recursive:true});
 try {
  await writeFile(PPM,Buffer.concat([
    Buffer.from("P6\n"+width+" "+height+"\n255\n","ascii"),image]));
  const child=spawnSync("ffmpeg",[
   "-hide_banner","-loglevel","error","-y",
   "-loop","1","-framerate","2","-i",PPM,
   "-t","3","-an","-c:v","libx264","-preset","veryfast",
   "-crf","18","-pix_fmt","yuv420p","-movflags","+faststart",MP4,
  ],{encoding:"utf8",timeout:90000});
  if(child.error||child.status!==0)
    throw Error("FFmpeg synthetic page encoder failed: "+(child.stderr?.slice(0,300)||child.error?.message||"unknown"));
  console.log("Generated local CLEAR "+(graphic?"graphic":"SOLID BLACK")+" video for DRM packaging:",MP4);
 }finally{await rm(PPM,{force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
}
