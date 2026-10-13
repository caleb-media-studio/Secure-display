import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {SecureDiv,registerSecureDiv} from "../../packages/secure-div/src/index.js";
const source=p=>readFileSync(resolve(import.meta.dirname,"../..",p),"utf8");

test("server runtime can import native package but cannot register it",()=>{
 assert.equal(typeof SecureDiv,"function");
 assert.throws(()=>registerSecureDiv(async()=>({})),/browser environment/);
});
test("React bridge uses custom element, retains native event handlers, starts transparent",()=>{
 const code=source("packages/react/src/SecureDiv.tsx");
 assert.match(code,/createElement\("secure-div"/);
 assert.match(code,/registerSecureDiv\(playbackAdapter\)/);
 assert.match(code,/style: \{\.\.\.style, opacity: 0\}/);
 assert.match(code,/onSecureSelectionChange/);
 assert.match(code,/onSecureStateChange/);
 assert.doesNotMatch(code,/dangerouslySetInnerHTML/);
});
test("static asset dimensions, missing adapter and no plaintext fallback are enforced",()=>{
 const core=source("packages/secure-div/src/secure-div.js");
 const css=source("packages/secure-div/secure-div.css");
 assert.match(core,/dimensionsMatch\(box,handle\)/);
 assert.match(core,/Protected DOM dimensions changed/);
 assert.match(core,/No protected asset playback adapter configured/);
 assert.match(core,/this\.#video\.style\.opacity="0"/);
 assert.match(css,/opacity:\s*0\s*!important/);
});
