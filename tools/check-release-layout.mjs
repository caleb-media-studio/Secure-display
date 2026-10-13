#!/usr/bin/env node
/** Validate ONE packed npm artifact only; never publish. */
import assert from "node:assert/strict";
import {existsSync,readFileSync,statSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const name="@caleb-media-studio-llc/secure-display";
try{
 const folder="packages/secure-display";
 const pkg=JSON.parse(readFileSync(resolve(root,folder,"package.json"),"utf8"));
 assert.equal(pkg.name,name);
 assert.equal(pkg.private,true,"Do not publish without approval");
 assert.equal(pkg.license,"Apache-2.0");
 assert.equal(pkg.type,"module");
 assert.equal(pkg.repository?.url,"git+https://github.com/caleb-media-studio/Secure-display.git");
 assert.equal(pkg.repository?.directory,"packages/secure-display");
 assert.equal(pkg.homepage,"https://github.com/caleb-media-studio/Secure-display/tree/feat/initial-research-framework");
 assert.equal(pkg.bugs?.url,"https://github.com/caleb-media-studio/Secure-display/issues");
 assert.ok(!pkg.devDependencies || Object.keys(pkg.devDependencies).length===0,
  "The published package must not advertise private workspace dev dependencies");
 assert.equal(Object.keys(pkg.dependencies||{}).length,0,"No unpublished runtime workspace dependencies");
 assert.equal(pkg.version,"0.1.0-alpha.2","Next npm release must use a new immutable version.");
 assert.deepEqual(Object.keys(pkg.peerDependencies||{}),["react"]);
 assert.deepEqual(Object.keys(pkg.exports||{}),[".","./secure-div.css"]);
 for(const entry of Object.values(pkg.exports)){
  for(const file of [entry.types,entry.default]){
   assert.ok(file);
   const path=resolve(root,folder,file);
   assert.ok(existsSync(path)&&statSync(path).isFile(),"Missing exported artifact "+file);
  }
 }
 const result=spawnSync("npm",["pack","--dry-run","--json","--workspace",name],
  {cwd:root,encoding:"utf8",timeout:30000});
 if(result.status!==0)throw Error(result.stderr||result.stdout);
 const payload=JSON.parse(result.stdout);
 assert.equal(payload.length,1);
 assert.equal(payload[0].name,name);
 const files=payload[0].files.map(f=>f.path);
 for(const item of [
  "dist/index.js","dist/index.d.ts","dist/secure-div.css",
  "dist/secure-div.css.d.ts","README.md","package.json",
  "dist/types/react/SecureDiv.d.ts","dist/types/core/index.d.ts",
  "dist/types/secure-div/index.d.ts"
 ])assert.ok(files.includes(item),"Missing packed file "+item);
 const source=readFileSync(resolve(root,folder,"dist/index.js"),"utf8");
 assert.ok(!source.includes("@caleb-media-studio-llc/core"));
 assert.ok(!source.includes("@caleb-media-studio-llc/react"));
 assert.ok(!source.includes("@caleb-media-studio-llc/secure-div"));
 for(const file of files){
  assert.doesNotMatch(file,/(^|\/)(?:\.env(?:\.|$)|secrets?(?:\/|$)|private(?:\/|$))|\.(?:pem|p12|pfx|key)$/i);
 }
 for(const internal of ["core","react","secure-div","document","elements"]){
  const p=JSON.parse(readFileSync(resolve(root,"packages",internal,"package.json"),"utf8"));
  assert.equal(p.private,true,internal+" must remain an internal workspace");
 }
 console.log("PASS: exactly one registry candidate "+name+" ("+files.length+" packed files), private.");
}catch(error){console.error("Release inspection failed:",error);process.exitCode=1;}
