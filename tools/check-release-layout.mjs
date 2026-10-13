#!/usr/bin/env node
/**
 * Local-only npm/Bun release layout preflight. Never publishes or logs in.
 * Deliberately requires packages to stay private at this research stage.
 */
import assert from "node:assert/strict";
import {existsSync,readFileSync,statSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const paths=["core","secure-div","react"];
const failures=[];
const assertFile=(path)=>{
 const full=resolve(root,path);
 if(!existsSync(full)||!statSync(full).isFile())throw Error("Missing release file: "+path);
};

try {
 for(const name of paths){
  const folder="packages/"+name;
  const pkg=JSON.parse(readFileSync(resolve(root,folder,"package.json"),"utf8"));
  assert.equal(pkg.private,true,folder+" must stay unpublished until approval");
  assert.equal(pkg.license,"Apache-2.0");
  assert.equal(pkg.type,"module");
  assert.equal(pkg.repository?.url,"git+https://github.com/caleb-media-studio/Secure-display.git");
  assert.ok(Array.isArray(pkg.files)&&pkg.files.includes("README.md"),folder+" must pack a README");
  assertFile(folder+"/README.md");
  for(const definition of Object.values(pkg.exports||{})){
   if(typeof definition==="string")assertFile(folder+"/"+definition.replace(/^\.\//,""));
   else {
    if(definition.types)assertFile(folder+"/"+definition.types.replace(/^\.\//,""));
    if(definition.default)assertFile(folder+"/"+definition.default.replace(/^\.\//,""));
   }
  }
  // Check the files the *actual* registry pack command would include.
  const packed=spawnSync("npm",["pack","--dry-run","--json","--workspace",pkg.name],
   {cwd:root,encoding:"utf8",timeout:30000});
  if(packed.status!==0)throw Error(pkg.name+" npm pack failed: "+packed.stderr);
  const output=JSON.parse(packed.stdout);
  const fileNames=output[0]?.files?.map(entry=>entry.path)||[];
  assert.ok(fileNames.includes("package.json"));
  assert.ok(fileNames.includes("README.md"));
  if(name==="react"){
   assert.ok(fileNames.includes("dist/index.js"));
   assert.ok(fileNames.includes("dist/index.d.ts"));
  }
  if(name==="secure-div"){
   assert.ok(fileNames.includes("secure-div.css"));
   assert.ok(fileNames.includes("types/secure-div.css.d.ts"));
  }
  for(const path of fileNames){
   assert.ok(!/(^|\/)(\.env|secrets?|private)(\/|$)|\.(pem|pfx|p12|key)$/i.test(path),
    "Unexpected sensitive path packed: "+path);
  }
  console.log(pkg.name+": package layout valid ("+fileNames.length+" files, private)");
 }
 const react=JSON.parse(readFileSync(resolve(root,"packages/react/package.json"),"utf8"));
 for(const dependency of ["@caleb-media-studio-llc/core","@caleb-media-studio-llc/secure-div"]){
  assert.ok(react.dependencies?.[dependency],dependency+" must be declared");
 }
 console.log("PASS: three research packages have coherent exports and pack contents; publishing remains disabled.");
} catch(error) {
 console.error("Release inspection failed:",error.message);
 process.exitCode=1;
}
