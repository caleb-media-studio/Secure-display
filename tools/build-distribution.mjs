#!/usr/bin/env node
/**
 * Build the sole registry artifact. Internal workspace packages are inlined
 * into ESM and their declarations are relocated locally. No registry calls.
 */
import {spawnSync} from "node:child_process";
import {cpSync,existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync,copyFileSync} from "node:fs";
import {resolve,dirname,join,relative} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const dist=join(root,"packages/secure-display/dist");
function run(exe,args){
 const result=spawnSync(exe,args,{cwd:root,stdio:"inherit",timeout:120000});
 if(result.error||result.status!==0)throw Error(exe+" build failed");
}
for(const name of ["core","react"]){
 if(!existsSync(join(root,"packages",name,"dist","index.d.ts")))
  run("npx",["--no-install","tsc","-p","packages/"+name+"/tsconfig.json"]);
}
run("npx",["--no-install","vite","build","--config","packages/secure-display/vite.config.mjs"]);
const typeRoot=join(dist,"types");
function copyDeclarations(sourceDir,destinationDir,replaceImports=false){
 mkdirSync(destinationDir,{recursive:true});
 for(const name of readdirSync(sourceDir)){
  const src=join(sourceDir,name);
  if(!name.endsWith(".d.ts"))continue;
  let contents=readFileSync(src,"utf8");
  if(replaceImports){
   contents=contents
    .replaceAll('"@caleb-media-studio-llc/core"','"../core/index.js"')
    .replaceAll('"@caleb-media-studio-llc/secure-div"','"../secure-div/index.js"');
  }
  writeFileSync(join(destinationDir,name),contents);
 }
}
copyDeclarations(join(root,"packages/core/dist"),join(typeRoot,"core"));
copyDeclarations(join(root,"packages/react/dist"),join(typeRoot,"react"),true);
copyDeclarations(join(root,"packages/secure-div/types"),join(typeRoot,"secure-div"));
copyFileSync(join(root,"packages/secure-div/secure-div.css"),join(dist,"secure-div.css"));
writeFileSync(join(dist,"secure-div.css.d.ts"),"export {};\n");
writeFileSync(join(dist,"index.d.ts"),[
 'export {SecureDiv,SecureDisplay,configureSecureDisplay,getSecureDisplayConfiguration,useSecureDisplayStatus} from "./types/react/index.js";',
 'export type {SecureDivProps,SecureDivState,SecureDivSelection} from "./types/react/SecureDiv.js";',
 'export type {SecureDisplayProps} from "./types/react/SecureDisplay.js";',
 'export type {ProtectedAssetBinding,SecureDisplayConfiguration} from "./types/react/configureSecureDisplay.js";',
 'export type {SecureDivObservedState} from "./types/react/useSecureDisplayStatus.js";',
 'export {registerSecureDiv,selectionGeometry,updateSelectionIndicator,serializeProtectedChildren,hashProtectedChildren,SecureDiv as SecureDivElement} from "./types/secure-div/index.js";',
 'export type {SecureDivPlayback,SecureDivPlaybackAdapter} from "./types/secure-div/index.js";',
 'export * from "./types/core/index.js";',
 ''
].join("\n"));
const manifest=JSON.parse(readFileSync(join(root,"packages/secure-display/package.json"),"utf8"));
if(Object.keys(manifest.dependencies||{}).length)
 throw Error("Single distribution must not have internal production dependencies.");
for(const f of ["index.js","index.d.ts","secure-div.css","secure-div.css.d.ts"])
 if(!existsSync(join(dist,f)))throw Error("Missing distribution artifact "+f);
console.log("PASS: "+manifest.name+" built as one bundle with local types and CSS.");
