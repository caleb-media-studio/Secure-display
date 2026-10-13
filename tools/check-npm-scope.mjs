#!/usr/bin/env node
/** Prevent the old three-package release design from reappearing. */
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {join,resolve,dirname,relative} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const single="@caleb-media-studio-llc/secure-display";
const excluded=new Set([".git","node_modules","dist","build","coverage",".secure-display-local","fixtures",".next"]);
const violations=[];
function scan(dir){
 for(const item of readdirSync(dir,{withFileTypes:true})){
  const path=join(dir,item.name);
  const relativePath=relative(root,path).replaceAll("\\","/");
  if(item.isDirectory()){
   if(excluded.has(item.name)||relativePath==="docs/history")continue;
   scan(path);
  }else if(item.isFile()&&/\.(?:md|mjs|js|ts|tsx|json|yml|yaml|html|css)$/.test(item.name)){
   const contents=readFileSync(path,"utf8");
   if(contents.includes("@"+"secure-display/"))violations.push(relativePath+": stale old scope");
  }
 }
}
scan(root);
const pkg=JSON.parse(readFileSync(join(root,"packages/secure-display/package.json"),"utf8"));
assert.equal(pkg.name,single);
assert.equal(pkg.private,true);
for(const internal of ["core","react","secure-div","document","elements"]){
 const p=JSON.parse(readFileSync(join(root,"packages",internal,"package.json"),"utf8"));
 assert.equal(p.private,true);
}
assert.deepEqual(violations,[]);
console.log("PASS: one proposed npm package "+single+"; internal research remains private.");
