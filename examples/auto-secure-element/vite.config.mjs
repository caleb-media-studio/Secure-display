import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {createNetworkViteConfig} from "../../tools/network-vite-config.mjs";
const dir=dirname(fileURLToPath(import.meta.url));
export default {
 ...createNetworkViteConfig(),
 build:{rollupOptions:{input:{
  native:resolve(dir,"index.html"),
  react:resolve(dir,"react/index.html"),
 }}},
};
