#!/usr/bin/env node
/**
 * Check the real npm scope before any package is packed or published.
 * Archived historical lab logs intentionally retain their original wording.
 */
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {join,resolve,dirname,relative} from "node:path";
import {fileURLToPath} from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const scope="@caleb-media-studio-llc";
const oldScope="@"+"secure-display/";
const excludedDirs=new Set([
  ".git","node_modules","dist","build","coverage",".secure-display-local",
  "fixtures",".next"
]);
const failures=[];
function scan(dir){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  const path=join(dir,entry.name),rel=relative(root,path).replaceAll("\\","/");
  if(entry.isDirectory()){
   if(excludedDirs.has(entry.name)||rel==="docs/history")continue;
   scan(path);
  }else if(entry.isFile()&&/\.(?:md|mjs|js|ts|tsx|json|yml|yaml|html|css)$/.test(entry.name)){
   if(readFileSync(path,"utf8").includes(oldScope))failures.push(rel);
  }
 }
}
for(const name of ["core","secure-div","react","elements","document"]){
 const file=join(root,"packages",name,"package.json");
 const pkg=JSON.parse(readFileSync(file,"utf8"));
 assert.equal(pkg.name,scope+"/"+name);
 assert.equal(pkg.private,true,"Keep research packages unpublished pending review.");
 for(const dep of Object.keys(pkg.dependencies??{})){
  if(dep.startsWith("@")&&dep.includes("secure-display"))
    assert.ok(dep.startsWith(scope+"/"),"Unexpected scoped dependency in "+name+": "+dep);
 }
}
scan(root);
assert.deepEqual(failures,[],"Legacy npm imports remain in active files");
console.log("PASS: active source/docs use "+scope+"; all research packages stay private.");
