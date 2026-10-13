#!/usr/bin/env node
/**
 * Prepare exactly one experimental npm package from a validated CI workspace.
 * No publishing happens here. Never check this temporary manifest into Git.
 */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const MANIFEST=resolve(ROOT,"packages/secure-display/package.json");
const REPO="caleb-media-studio/Secure-display";
const PACKAGE="@caleb-media-studio-llc/secure-display";

export function requireMainPush(env){
 assert.equal(env.GITHUB_ACTIONS,"true","This operation is restricted to GitHub Actions");
 assert.equal(env.GITHUB_REPOSITORY,REPO,"Unexpected GitHub repository");
 assert.equal(env.GITHUB_EVENT_NAME,"push","Publish only on push events");
 assert.equal(env.GITHUB_REF,"refs/heads/main","Publish only from main");
 for(const field of ["GITHUB_RUN_NUMBER","GITHUB_RUN_ATTEMPT"])
  assert.match(env[field]||"",/^[1-9][0-9]*$/,"Invalid "+field);
}

export function makeReleaseVersion(base,number,attempt){
 const m=/^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(base);
 assert.ok(m,"The checked-in package must use a valid SemVer base");
 for(const value of [number,attempt])
  assert.match(String(value),/^[1-9][0-9]*$/,"Invalid CI run identifier");
 return m[1]+"."+m[2]+"."+m[3]+"-main."+number+"."+attempt;
}

export function prepareManifest(manifest,env){
 requireMainPush(env);
 assert.equal(manifest.name,PACKAGE);
 assert.equal(manifest.private,true,"Tracked manifest must default to private");
 assert.equal(manifest.repository?.url,"git+https://github.com/"+REPO+".git");
 assert.deepEqual(Object.keys(manifest.dependencies||{}),[],"Internal deps must remain bundled");
 assert.deepEqual(Object.keys(manifest.devDependencies||{}),[],"No internal dev dependencies in release");
 assert.deepEqual(Object.keys(manifest.peerDependencies||{}),["react"]);
 return {...manifest,version:makeReleaseVersion(manifest.version,env.GITHUB_RUN_NUMBER,env.GITHUB_RUN_ATTEMPT),private:undefined};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const manifest=JSON.parse(readFileSync(MANIFEST,"utf8"));
  const release=prepareManifest(manifest,process.env);
  const {private:_,...publicManifest}=release;
  writeFileSync(MANIFEST,JSON.stringify(publicManifest,null,2)+"\n");
  console.log("Prepared only "+publicManifest.name+"@"+publicManifest.version+" for experimental npm publishing.");
 }catch(error){
  console.error("Cannot prepare npm release:",error.message);
  process.exitCode=1;
 }
}
