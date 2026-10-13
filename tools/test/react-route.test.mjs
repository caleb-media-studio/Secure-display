import test from "node:test";
import assert from "node:assert/strict";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {createServer} from "vite";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const example=resolve(root,"examples/auto-secure-element");

test("React shortcut redirects to the React HTML entry even with local TLS configured",async()=>{
 const server=await createServer({
  root:example,
  configFile:resolve(example,"vite.config.mjs"),
  server:{host:"127.0.0.1",port:0,strictPort:false,https:false},
  logLevel:"silent",
 });
 try {
  await server.listen();
  const address=server.httpServer?.address();
  assert.ok(address && typeof address!=="string");
  const origin="http://127.0.0.1:"+address.port;
  const redirect=await fetch(origin+"/react",{redirect:"manual"});
  assert.equal(redirect.status,308);
  assert.equal(redirect.headers.get("location"),"/react/");
  const page=await fetch(origin+"/react/");
  assert.equal(page.status,200);
  assert.match(page.headers.get("content-type")??"",/text\/html/);
  const html=await page.text();
  assert.match(html,/React component experiment/);
  assert.match(html,/react\/main\.tsx/);
 }finally{await server.close();}
});
