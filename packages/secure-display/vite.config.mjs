import {defineConfig} from "vite";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";

const dir=dirname(fileURLToPath(import.meta.url));
export default defineConfig({
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
