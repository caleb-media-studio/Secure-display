import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {getLabConfig,DEFAULT_URL}=require("../config.cjs");
test("default lab uses local trusted HTTPS React route with protection OFF",()=>{
 assert.deepEqual(getLabConfig({}),{url:DEFAULT_URL,captureProtection:false});
});
test("native capture toggles without changing the page or SSR",()=>{
 const env={SECURE_DISPLAY_LAB_URL:"https://localhost:5173/react/",SECURE_DISPLAY_CAPTURE_PROTECTION:"on"};
 const protectedRun=getLabConfig(env);
 const clearRun=getLabConfig({...env,SECURE_DISPLAY_CAPTURE_PROTECTION:"off"});
 assert.equal(protectedRun.url,clearRun.url);
 assert.equal(protectedRun.captureProtection,true);
 assert.equal(clearRun.captureProtection,false);
});
test("untrusted protocols, nonlocal plain HTTP and embedded credentials fail",()=>{
 for(const url of ["file:///etc/passwd","javascript:alert(1)","http://example.com",
 "https://name:pass@example.org/"]){
  assert.throws(()=>getLabConfig({SECURE_DISPLAY_LAB_URL:url}),url);
 }
 assert.equal(getLabConfig({SECURE_DISPLAY_LAB_URL:"http://127.0.0.1:5173/react/"}).url,
 "http://127.0.0.1:5173/react/");
 assert.throws(()=>getLabConfig({SECURE_DISPLAY_CAPTURE_PROTECTION:"enabled"}));
});
