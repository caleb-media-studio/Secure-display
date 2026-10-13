import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {createNetworkViteConfig} from "../../tools/network-vite-config.mjs";
const dir=dirname(fileURLToPath(import.meta.url));
export default {
 plugins:[{
  name:"secure-display-react-route-slash",
  configureServer(server){
   server.middlewares.use((request,response,next)=>{
    const url=request.url??"";
    if((request.method==="GET"||request.method==="HEAD")&&
       (url==="/react"||url.startsWith("/react?"))){
     response.writeHead(308,{Location:"/react/"+url.slice("/react".length)});
     response.end();
     return;
    }
    next();
   });
  },
 }],
 ...createNetworkViteConfig(),
 build:{rollupOptions:{input:{
  native:resolve(dir,"index.html"),
  react:resolve(dir,"react/index.html"),
 }}},
};
