#!/usr/bin/env node
/**
 * Package the default solid-black synthetic clear intermediate into real
 * FairPlay HLS and Widevine DASH using the same published Axinom TEST vector
 * as the validated protected-document example. Not production licensing.
 */
import {spawnSync} from "node:child_process";
import {randomBytes} from "node:crypto";
import {mkdirSync,existsSync,rmSync,writeFileSync,copyFileSync} from "node:fs";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {vectorUrl,parseVector,packagerArgs} from "./package-test-document.mjs";
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const PUBLIC=resolve(ROOT,"examples/protected-page/public");
const OUTPUT=join(PUBLIC,"drm-page");
const PROBE_OUTPUT=join(PUBLIC,"drm-probe");
const PROBE_INPUT=resolve(ROOT,"fixtures/generated/protected-probe-clear.mp4");
const INPUT=resolve(ROOT,"fixtures/generated/protected-page-clear.mp4");
export function packagedPageFiles() {
 return {hls:"/drm-page/master.m3u8",dash:"/drm-page/master.mpd"};
}
async function main() {
 if(process.argv.includes("--dry-run")){
   console.log("Synthetic full-page fixture: public test CBCS, FairPlay HLS and Widevine DASH, no clear lead.");
   return;
 }
 // Repackage the blank DRM layer explicitly; never reuse old text-bearing
 // fixture metadata as proof that a fresh black video is in place.
 mkdirSync(OUTPUT,{recursive:true,mode:0o700});
 rmSync(join(OUTPUT,"fixture-info.json"),{force:true});
 const result=spawnSync(process.execPath,["tools/generate-protected-page-video.mjs"],{cwd:ROOT,stdio:"inherit"});
 if(result.error||result.status!==0) throw Error("Black page rasterizer failed.");
 const probeVideo=spawnSync(process.execPath,["tools/generate-protected-page-video.mjs","--probe"],{cwd:ROOT,stdio:"inherit"});
 if(probeVideo.error||probeVideo.status!==0) throw Error("Reference color video generator failed.");
 const response=await fetch(vectorUrl,{signal:AbortSignal.timeout(20000)});
 if(!response.ok) throw Error("Public Axinom test vectors are unavailable. HTTP "+response.status);
 const {kid,keyHex}=parseVector(await response.text());
 mkdirSync(OUTPUT,{recursive:true,mode:0o700});
 mkdirSync(PROBE_OUTPUT,{recursive:true,mode:0o700});
 rmSync(join(PROBE_OUTPUT,"fixture-info.json"),{force:true});
 const packager=process.env.SECURE_DISPLAY_PACKAGER||"packager";
 const packaged=spawnSync(packager,packagerArgs(INPUT,OUTPUT,kid,keyHex,randomBytes(16).toString("hex")),{cwd:ROOT,stdio:"inherit"});
 if(packaged.error||packaged.status!==0) throw Error("Black Shaka Packager operation failed: "+packager);
 const probePackaged=spawnSync(packager,packagerArgs(PROBE_INPUT,PROBE_OUTPUT,kid,keyHex,randomBytes(16).toString("hex")),{cwd:ROOT,stdio:"inherit"});
 if(probePackaged.error||probePackaged.status!==0) throw Error("Color probe Shaka Packager operation failed: "+packager);
 for(const output of [OUTPUT,PROBE_OUTPUT]){
  for(const name of ["master.m3u8","master.mpd"])
   if(!existsSync(join(output,name)))throw Error("DRM packaging did not create "+join(output,name));
 }
 // Only synthetic test video: clear and DRM media must show identical pixels
 // on the physical screen, but the DRM video may be excluded from capture.
 copyFileSync(PROBE_INPUT,join(PUBLIC,"probe-clear.mp4"));
 writeFileSync(join(PROBE_OUTPUT,"fixture-info.json"),JSON.stringify({
  kind:"color-probe-v1",width:1280,height:720,
  generatedAt:new Date().toISOString(),purpose:"Protected-vs-clear display capture calibration",
 },null,2)+"\n");
 writeFileSync(join(OUTPUT,"fixture-info.json"),JSON.stringify({
  kind:"solid-black-v1",
  width:1280,
  height:720,
  purpose:"DRM overlay compositing over ordinary DOM",
  generatedAt:new Date().toISOString(),
 },null,2)+"\n");
 console.log("FairPlay and Widevine SOLID BLACK overlay and COLOR capture calibration fixtures ready.");
 console.log("Run: bun run example:page");
 console.log("WARNING: content keys are publicly known test vectors, never private keys.");
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
