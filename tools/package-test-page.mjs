#!/usr/bin/env node
/**
 * Package only the fixed synthetic-page clear intermediate into actual
 * FairPlay HLS and Widevine DASH using the same published Axinom TEST vector
 * as the validated protected-document example. Not production licensing.
 */
import {spawnSync} from "node:child_process";
import {randomBytes} from "node:crypto";
import {mkdirSync,existsSync} from "node:fs";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {vectorUrl,parseVector,packagerArgs} from "./package-test-document.mjs";
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const PUBLIC=resolve(ROOT,"examples/protected-page/public");
const OUTPUT=join(PUBLIC,"drm-page");
const INPUT=resolve(ROOT,"fixtures/generated/protected-page-clear.mp4");
export function packagedPageFiles() {
 return {hls:"/drm-page/master.m3u8",dash:"/drm-page/master.mpd"};
}
async function main() {
 if(process.argv.includes("--dry-run")){
   console.log("Synthetic full-page fixture: public test CBCS, FairPlay HLS and Widevine DASH, no clear lead.");
   return;
 }
 const result=spawnSync(process.execPath,["tools/generate-protected-page-video.mjs"],{cwd:ROOT,stdio:"inherit"});
 if(result.error||result.status!==0) throw Error("Synthetic page rasterizer failed.");
 const response=await fetch(vectorUrl,{signal:AbortSignal.timeout(20000)});
 if(!response.ok) throw Error("Public Axinom test vectors are unavailable. HTTP "+response.status);
 const {kid,keyHex}=parseVector(await response.text());
 mkdirSync(OUTPUT,{recursive:true,mode:0o700});
 const packager=process.env.SECURE_DISPLAY_PACKAGER||"packager";
 const packaged=spawnSync(packager,packagerArgs(INPUT,OUTPUT,kid,keyHex,randomBytes(16).toString("hex")),{cwd:ROOT,stdio:"inherit"});
 if(packaged.error||packaged.status!==0) throw Error("Shaka Packager required: "+packager+" (use SECURE_DISPLAY_PACKAGER for its absolute path).");
 for(const name of ["master.m3u8","master.mpd"])if(!existsSync(join(OUTPUT,name)))throw Error("DRM packaging did not create "+name);
 console.log("FairPlay and Widevine full-page encrypted fixtures ready.");
 console.log("Run: bun run example:page");
 console.log("WARNING: content keys are publicly known test vectors, never private keys.");
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
