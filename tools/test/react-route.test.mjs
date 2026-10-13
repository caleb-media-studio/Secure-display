import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import viteConfig from "../../examples/auto-secure-element/vite.config.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
function middleware(){
 let callback;
 const plugin=viteConfig.plugins.find(p=>p.name==="secure-display-react-route-slash");
 assert.ok(plugin,"The dedicated React route plugin must exist");
 plugin.configureServer({middlewares:{use(fn){callback=fn;}}});
 assert.equal(typeof callback,"function");
 return callback;
}
function route(handler,method,url){
 let status=null,headers=null,ended=false,next=false;
 handler({method,url},{
  writeHead(code,fields){status=code;headers=fields;},
  end(){ended=true;}
 },()=>{next=true;});
 return {status,headers,ended,next};
}
test("React route redirect works for GET and HEAD without starting a Vite HTTP server",()=>{
 const handle=middleware();
 assert.deepEqual(route(handle,"GET","/react"),{
  status:308,headers:{Location:"/react/"},ended:true,next:false
 });
 assert.deepEqual(route(handle,"HEAD","/react?x=1"),{
  status:308,headers:{Location:"/react/?x=1"},ended:true,next:false
 });
 for(const [method,url] of [["GET","/react/"],["POST","/react"],["GET","/capture-test.html"]]){
  assert.deepEqual(route(handle,method,url),{
   status:null,headers:null,ended:false,next:true
  });
 }
});
test("the React route still points to its real HTML entry",()=>{
 const page=readFileSync(resolve(root,"examples/auto-secure-element/react/index.html"),"utf8");
 assert.match(page,/React component experiment/);
 assert.match(page,/react\/main\.tsx/);
 assert.match(page,/secure-div\s*\{\s*opacity:0!important/);
});
