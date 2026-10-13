#!/usr/bin/env node
/**
 * Offline real-DOM screenshot -> H264 -> PUBLIC Axinom-test CBCS packaging.
 * Developer-only build step. Visitors need only stock HTTPS browsers.
 * Not suitable for confidential data; the public test key is retrievable.
 */
import {spawnSync} from "node:child_process";
import {createHash,randomBytes} from "node:crypto";
import {readFileSync,mkdirSync,writeFileSync,existsSync,rmSync} from "node:fs";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {parseVector,vectorUrl,packagerArgs} from "./package-test-document.mjs";

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const EXAMPLE=join(ROOT,"examples/auto-secure-element");
const HTML=join(EXAMPLE,"public/secure-content.html");
const BUILD=join(ROOT,"fixtures/generated/auto-secure");
const PUBLIC=join(EXAMPLE,"public/secure-asset");
const IMAGE=join(BUILD,"element.png");
const CLEAR=join(BUILD,"clear-element.mp4");
const EXPECTED={width:960,height:540};
function command(name,args) {
 const r=spawnSync(name,args,{cwd:ROOT,stdio:"inherit",timeout:120000});
 if(r.error||r.status!==0)
   throw Error(name+" failed; inspect the process output.");
}
export function snapshotParameters(){
 return {selector:"#snapshot-source",width:EXPECTED.width,height:EXPECTED.height};
}
export function checkDimensions({width,height}){
 if(width!==EXPECTED.width||height!==EXPECTED.height)
   throw Error("Source card must be 960x540 for this fixed-resolution proof of concept.");
 return true;
}
async function snapshotDOM(){
 let chromium;
 try{({chromium}=await import("playwright-core"));}
 catch{throw Error("Run bun install first (playwright-core is a dev dependency).");}
 let browser;
 try {
  const path=process.env.SECURE_DISPLAY_CHROME_PATH;
  browser=await chromium.launch(path?{executablePath:path,headless:true}:{channel:"chrome",headless:true});
 }catch(e){
  throw Error("Chrome is required on the developer machine for build-time DOM capture. Set SECURE_DISPLAY_CHROME_PATH if it is not in the standard location. "+(e?.message||""));
 }
 try{
  const page=await browser.newPage({viewport:{width:EXPECTED.width,height:EXPECTED.height},
    deviceScaleFactor:1,reducedMotion:"reduce"});
  await page.goto(pathToFileURL(HTML).href,{waitUntil:"load"});
  await page.evaluate(()=>document.fonts.ready);
  const card=page.locator("#snapshot-source");
  if(await card.count()!==1)throw Error("A single #snapshot-source element is required.");
  checkDimensions(await card.evaluate(el=>{
   const box=el.getBoundingClientRect();
   return {width:box.width,height:box.height};
  }));
  await card.screenshot({path:IMAGE,animations:"disabled",scale:"css"});
 }finally{await browser?.close();}
}
async function main(){
 if(process.argv.includes("--dry-run")){
  console.log("Capture one genuine DOM element in Chrome, package FairPlay HLS and Widevine DASH using public Axinom TEST keys.");
  return;
 }
 const markup=readFileSync(HTML,"utf8");
 if(!markup.includes("This page is protected by Security Display GitHub repo, and this is a test."))
  throw Error("The synthetic DOM source sentence was unexpectedly changed.");
 mkdirSync(BUILD,{recursive:true});
 mkdirSync(PUBLIC,{recursive:true});
 // Fail closed if the packaging flow exits early. Do not serve stale assets.
 rmSync(join(PUBLIC,"asset-info.json"),{force:true});
 console.log("Rendering the ACTUAL source HTML/CSS, not rebuilding card pixels manually...");
 await snapshotDOM();
 command("ffmpeg",["-hide_banner","-loglevel","error","-y","-loop","1","-framerate","24",
  "-i",IMAGE,"-t","3","-an","-c:v","libx264","-pix_fmt","yuv420p",
  "-r","24","-movflags","+faststart",CLEAR]);
 if(process.argv.includes("--snapshot-only")){
  console.log("Successfully rendered real DOM to PNG and encoded H.264; DRM packaging skipped by test option.");
  return;
 }
 const r=await fetch(vectorUrl,{signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error("Public Axinom test vector unavailable (HTTP "+r.status+").");
 const {kid,keyHex}=parseVector(await r.text());
 const packager=process.env.SECURE_DISPLAY_PACKAGER||"packager";
 command(packager,packagerArgs(CLEAR,PUBLIC,kid,keyHex,randomBytes(16).toString("hex")));
 for(const name of ["master.mpd","master.m3u8","video.mp4"]) {
  if(!existsSync(join(PUBLIC,name))) throw Error("Missing encrypted media output: "+name);
 }
 const signature=createHash("sha256").update(readFileSync(IMAGE)).digest("hex");
 writeFileSync(join(PUBLIC,"asset-info.json"),JSON.stringify({
  kind:"automated-dom-drm-v1",classification:"synthetic-test-only",
  assetId:"demo-card",width:EXPECTED.width,height:EXPECTED.height,
  screenshotSha256:signature,
  sourceSha256:createHash("sha256").update(markup).digest("hex"),
  generatedAt:new Date().toISOString()
 },null,2)+"\n");
 console.log("Real HTML screenshot encoded into encrypted FairPlay/Widevine media. Run: bun run example:auto-element");
 console.log("Visitor requires NO Chrome install: only the developer's build step uses headless Chrome.");
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
