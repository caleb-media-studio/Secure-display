import test from "node:test";
import assert from "node:assert/strict";
import {parseVector,packagerArgs,manifestFromLayout} from "../package-test-document.mjs";
test("public test vector parser",()=>{
 const data=parseVector("Key ID: 302f80dd-411e-4886-bca5-bb1f8018a024\nContent Key: FbKq+Qbr7GMJ1A+RKJEnuA==");
 assert.equal(data.kid,"302f80dd-411e-4886-bca5-bb1f8018a024");
 assert.equal(data.keyHex.length,32);
 assert.throws(()=>parseVector("not a key"));
});
test("packager uses DRM CBCS and has no clear lead",()=>{
 const a=packagerArgs("/tmp/sample.mp4","/tmp/o","302f80dd-411e-4886-bca5-bb1f8018a024",
   "0123456789abcdef0123456789abcdef","abcdef0123456789abcdef0123456789");
 assert.ok(a.includes("cbcs"));
 assert.ok(a.includes("FairPlay,Widevine"));
 assert.equal(a[a.indexOf("--clear_lead")+1],"0");
 assert.ok(a.some(x=>x.startsWith("skd://")));
});
test("geometry manifest does not contain raw key or plaintext",()=>{
 const l={page:{id:"page-1",width:640,height:360,
   lines:[{y:5,height:10,glyphs:[{index:0,x:8,width:6}]}]}};
 const m=manifestFromLayout(l,"fairplay");
 assert.equal(m.pages[0].media.keySystem,"com.apple.fps");
 assert.ok(!JSON.stringify(m).includes("Content Key"));
 assert.throws(()=>manifestFromLayout(l,"unprotected"));
});
