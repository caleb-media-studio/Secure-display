import {defineConfig} from "vite";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";

const dir=dirname(fileURLToPath(import.meta.url));
export default defineConfig({
 // Bundle implementation modules directly from this monorepo. The public
 // package intentionally has NO internal devDependencies or registry
 // dependencies, so its build must never rely on node_modules symlinks for
 // unpublished @caleb-media-studio-llc/core, /react or /secure-div.
 resolve:{
   alias:[
     {find:"@caleb-media-studio-llc/react",replacement:resolve(dir,"../react/src/index.ts")},
     {find:"@caleb-media-studio-llc/core",replacement:resolve(dir,"../core/src/index.ts")},
     {find:"@caleb-media-studio-llc/secure-div",replacement:resolve(dir,"../secure-div/src/index.js")}
   ]
 },

  build:{
    target:"es2022",
    sourcemap:false,
    minify:false,
    lib:{entry:resolve(dir,"src/index.ts"),formats:["es"],fileName:()=>"index.js"},
    rollupOptions:{external:["react","react/jsx-runtime","react/jsx-dev-runtime"]},
    outDir:resolve(dir,"dist"),
    emptyOutDir:true
  }
});
