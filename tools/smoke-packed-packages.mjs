#!/usr/bin/env node
/**
 * Test the actual npm tarballs in a fresh project outside the monorepo.
 * Does not publish or authenticate to any registry.
 * Usage: node tools/smoke-packed-packages.mjs [npm|bun]
 */
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve,dirname} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const manager=process.argv[2]??"npm";
if(!["npm","bun"].includes(manager)){
 console.error("Usage: node tools/smoke-packed-packages.mjs [npm|bun]");
 process.exit(2);
}
const directory=mkdtempSync(join(tmpdir(),"secure-display-pack-"));
const packages=["core","secure-div","react"];
function run(command,args,cwd=root){
 const result=spawnSync(command,args,{
  cwd,encoding:"utf8",timeout:180000,maxBuffer:4*1024*1024,
  env:{...process.env,npm_config_update_notifier:"false"}
 });
 if(result.error||result.status!==0){
  throw Error(command+" "+args.join(" ")+" failed:\n"+
   (result.stderr||result.stdout||String(result.error)));
 }
 return result.stdout.trim();
}
try{
 const consumer=join(directory,"consumer");
 mkdirSync(consumer);
 const dependencies={react:"19.2.0"};
 for(const name of packages){
  const pkg=JSON.parse(readFileSync(join(root,"packages",name,"package.json"),"utf8"));
  assert.equal(pkg.name,"@secure-display/"+name);
  // npm pack works for private packages but npm publish stays blocked.
  const packed=JSON.parse(run("npm",[
   "pack","--json","--workspace",pkg.name,"--pack-destination",directory
  ]));
  assert.equal(packed.length,1);
  const tarball=join(directory,packed[0].filename);
  assert.ok(existsSync(tarball),"Missing tarball: "+name);
  for(const file of packed[0].files){
   assert.doesNotMatch(file.path,/(^|\/)(?:\.env(?:\.|$)|secrets?(?:\/|$)|private(?:\/|$))|\.(?:pem|p12|pfx|key)$/i);
  }
  dependencies[pkg.name]=pathToFileURL(tarball).href;
 }
 writeFileSync(join(consumer,"package.json"),JSON.stringify({
  name:"secure-display-isolated-install-smoke",
  version:"0.0.0",private:true,type:"module",dependencies
 },null,2)+"\n");
 if(manager==="npm")run("npm",["install","--ignore-scripts","--no-audit","--no-fund"],consumer);
 else run("bun",["install","--ignore-scripts"],consumer);
 const entry=join(consumer,"smoke.mjs");
 writeFileSync(entry,[
  'import assert from "node:assert/strict";',
  'import {registerSecureDiv} from "@secure-display/secure-div";',
  'import {SecureDiv,configureSecureDisplay,useSecureDisplayStatus} from "@secure-display/react";',
  'import * as core from "@secure-display/core";',
  'assert.equal(typeof registerSecureDiv,"function");',
  'assert.equal(typeof SecureDiv,"function");',
  'assert.equal(typeof configureSecureDisplay,"function");',
  'assert.equal(typeof useSecureDisplayStatus,"function");',
  'assert.ok(Object.keys(core).length>0);',
  'console.log("Isolated package imports succeeded");',
  ""
 ].join("\n"));
 run("node",[entry],consumer);
 for(const file of [
  "@secure-display/core/dist/index.d.ts",
  "@secure-display/react/dist/index.d.ts",
  "@secure-display/secure-div/types/index.d.ts",
  "@secure-display/secure-div/secure-div.css",
  "@secure-display/secure-div/types/secure-div.css.d.ts"
 ]){
  assert.ok(existsSync(join(consumer,"node_modules",file)),"Missing installed artifact: "+file);
 }
 console.log("PASS: "+manager+" installed all three tarballs and resolved JS, types and CSS outside the workspace.");
}finally{
 rmSync(directory,{recursive:true,force:true});
}
