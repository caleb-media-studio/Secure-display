#!/usr/bin/env node
/** Isolated consumer smoke test of ONE tarball with npm or Bun. No publishing. */
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve,dirname} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const manager=process.argv[2]??"npm";
if(!["npm","bun"].includes(manager))throw Error("Choose npm or bun");
const name="@caleb-media-studio-llc/secure-display";
const directory=mkdtempSync(join(tmpdir(),"secure-display-single-pack-"));
function run(exe,args,cwd=root){
 const r=spawnSync(exe,args,{cwd,encoding:"utf8",timeout:180000,maxBuffer:5*1024*1024,
  env:{...process.env,npm_config_update_notifier:"false"}});
 if(r.status!==0||r.error)throw Error(exe+" "+args.join(" ")+" failed:\n"+(r.stderr||r.stdout||String(r.error)));
 return r.stdout.trim();
}
try{
 const consumer=join(directory,"consumer");mkdirSync(consumer);
 const packed=JSON.parse(run("npm",["pack","--json","--workspace",name,"--pack-destination",directory]));
 assert.equal(packed.length,1);assert.equal(packed[0].name,name);
 const tarball=join(directory,packed[0].filename);
 assert.ok(existsSync(tarball));
 const dependencies={react:"19.2.0","@types/react":"19.2.0",[name]:pathToFileURL(tarball).href};
 writeFileSync(join(consumer,"package.json"),JSON.stringify({
  name:"secure-display-single-consumer-test",version:"0.0.0",private:true,type:"module",dependencies
 },null,2)+"\n");
 if(manager==="npm")run("npm",["install","--ignore-scripts","--no-audit","--no-fund"],consumer);
 else run("bun",["install","--ignore-scripts"],consumer);
 const js=join(consumer,"smoke.mjs");
 writeFileSync(js,[
  'import assert from "node:assert/strict";',
  'import {SecureDiv,SecureDivElement,registerSecureDiv,configureSecureDisplay,useSecureDisplayStatus,probeDrmPaths} from "@caleb-media-studio-llc/secure-display";',
  'for(const value of [SecureDiv,SecureDivElement,registerSecureDiv,configureSecureDisplay,useSecureDisplayStatus,probeDrmPaths]) assert.equal(typeof value,"function");',
  'console.log("One-package runtime imports passed");',""
 ].join("\n"));
 run("node",[js],consumer);
 const css=join(consumer,"node_modules","@caleb-media-studio-llc","secure-display","dist","secure-div.css");
 assert.ok(existsSync(css),"Missing CSS guard");
 for(const forbidden of ["@caleb-media-studio-llc/core","@caleb-media-studio-llc/react","@caleb-media-studio-llc/secure-div"]){
  assert.equal(existsSync(join(consumer,"node_modules",...forbidden.split("/"))),false,
   "Installed unpublished internal dependency "+forbidden);
 }
 const tsFile=join(consumer,"smoke.tsx");
 writeFileSync(tsFile,[
  'import {type SecureDisplayConfiguration,SecureDiv,configureSecureDisplay,type SecureDivPlaybackAdapter} from "@caleb-media-studio-llc/secure-display";',
  'const playbackAdapter:SecureDivPlaybackAdapter=async()=>({width:960,height:540,drm:"test",destroy:async()=>{}});',
  'const config:SecureDisplayConfiguration={resolveAsset:async()=>({assetId:"x",sourceSha256:"a".repeat(64),domSha256:"b".repeat(64),rootClassName:"c"}),playbackAdapter};',
  'configureSecureDisplay(config);',
  'const component=<SecureDiv className="test"><p>synthetic only</p></SecureDiv>;',
  'void component;', ""
 ].join("\n"));
 writeFileSync(join(consumer,"tsconfig.json"),JSON.stringify({
  compilerOptions:{target:"ES2022",module:"NodeNext",moduleResolution:"NodeNext",
   jsx:"react-jsx",strict:true,skipLibCheck:false,noEmit:true,esModuleInterop:true},
  files:["smoke.tsx"]
 },null,2));
 run("node",[join(root,"node_modules/typescript/bin/tsc"),"--project",join(consumer,"tsconfig.json")],consumer);
 console.log("PASS: "+manager+" installed ONE secure-display tarball, JS and TSX imports and CSS.");
}finally{rmSync(directory,{recursive:true,force:true});}
