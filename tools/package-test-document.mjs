#!/usr/bin/env node
/**
 * Encrypt ONLY the bundled synthetic text video with Axinom's PUBLIC demo
 * key, obtained at runtime. NOT appropriate for any confidential data.
 * Requires ffmpeg + Shaka Packager installed locally.
 */
import {spawnSync} from "node:child_process";
import {existsSync,readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {randomBytes} from "node:crypto";
import {dirname,resolve,join} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const publicDir=join(root,"examples/protected-document/public");
const output=join(publicDir,"drm-synthetic");
export const vectorUrl="https://raw.githubusercontent.com/Axinom/public-test-vectors/master/ContentKeys/Axinom-Encoding-Cmaf-H264-protected-SingleKey.txt";
const endpoints={
 fairplay:{keySystem:"com.apple.fps",format:"hls",manifestUrl:"/drm-synthetic/master.m3u8",
  licenseUrl:"https://drm-fairplay-licensing.axprod.net/AcquireLicense",
  certificateUrl:"https://tools.axinom.com/FPScert/fairplay.cer"},
 widevine:{keySystem:"com.widevine.alpha",format:"dash",manifestUrl:"/drm-synthetic/master.mpd",
  licenseUrl:"https://drm-widevine-licensing.axprod.net/AcquireLicense"},
};
export function parseVector(text) {
 const kid=text.match(/Key ID:\s*([a-f0-9-]{36})/i)?.[1];
 const raw=text.match(/Content Key:\s*([A-Za-z0-9+/]{20,24}={0,2})/i)?.[1];
 if(!kid||!raw||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(kid))
   throw Error("Missing Axinom PUBLIC test vector.");
 const key=Buffer.from(raw,"base64");
 if(key.length!==16) throw Error("Test content key length mismatch.");
 return {kid,keyHex:key.toString("hex")};
}
export function packagerArgs(source,dir,kid,keyHex,iv) {
 if(!/^[a-f0-9]{32}$/i.test(keyHex)||!/^[a-f0-9]{32}$/i.test(iv))
   throw Error("Invalid public key or IV.");
 return [
  "in="+source+",stream=video,drm_label=SD,output="+join(dir,"video.mp4")+
    ",playlist_name=video.m3u8",
  "--enable_raw_key_encryption",
  "--keys","label=SD:key_id="+kid.replaceAll("-","")+":key="+keyHex+":iv="+iv,
  "--protection_scheme","cbcs",
  "--protection_systems","FairPlay,Widevine",
  "--clear_lead","0",
  "--hls_key_uri","skd://"+kid+":"+iv,
  "--hls_playlist_type","VOD",
  "--hls_master_playlist_output",join(dir,"master.m3u8"),
  "--mpd_output",join(dir,"master.mpd"),
 ];
}
export function manifestFromLayout(layout,drm) {
 const media=endpoints[drm];
 if(!media||!layout?.page||!Array.isArray(layout.page.lines))
   throw Error("Invalid geometry or DRM system.");
 const {id,width,height,lines}=layout.page;
 return {version:1,classification:"synthetic-test-only",
  pages:[{id,width,height,lines,media}]};
}
function mustRun(command,args) {
 const result=spawnSync(command,args,{cwd:root,stdio:"inherit"});
 if(result.error||result.status!==0) throw Error("Required CLI failed: "+command);
}
async function main() {
 if(process.argv.includes("--dry-run")) {
   console.log("Shaka Packager: public test CBCS, no clear lead, FairPlay HLS + Widevine DASH.");
   return;
 }
 mustRun(process.execPath,["tools/generate-synthetic-video.mjs","--drm-test"]);
 mustRun(process.execPath,["tools/generate-document-layout.mjs","--drm-test"]);
 const response=await fetch(vectorUrl,{signal:AbortSignal.timeout(20000)});
 if(!response.ok) throw Error("Axinom public test vector fetch failed (HTTP "+response.status+").");
 const {kid,keyHex}=parseVector(await response.text());
 const layout=JSON.parse(readFileSync(join(root,"fixtures/generated/document-geometry.json"),"utf8"));
 mkdirSync(output,{recursive:true,mode:0o700});
 const command=process.env.SECURE_DISPLAY_PACKAGER||"packager";
 const args=packagerArgs(join(root,"fixtures/generated/synthetic-clear.mp4"),
   output,kid,keyHex,randomBytes(16).toString("hex"));
 mustRun(command,args);
 if(!existsSync(join(output,"master.m3u8"))||!existsSync(join(output,"master.mpd")))
    throw Error("Packager did not produce both HLS and DASH manifests.");
 for(const drm of ["fairplay","widevine"])
   writeFileSync(join(publicDir,"synthetic-document-"+drm+".json"),
      JSON.stringify(manifestFromLayout(layout,drm),null,2)+"\n",{mode:0o600});
 console.log("Generated synthetic DRM media and geometry. Run: bun run example:document");
 console.log("WARNING: all demo content keys are PUBLIC; this is not confidential-data encryption.");
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(error=>{console.error(error.message);process.exitCode=1;});
