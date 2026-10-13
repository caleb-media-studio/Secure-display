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
 assert.match(code,/registerSecureDiv\(adapter\)/);
 assert.match(code,/getSecureDisplayConfiguration/);
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

test("example mounts unconditionally, and its code is typechecked",()=>{
 const app=source("examples/auto-secure-element/react/App.tsx");
 const pkg=JSON.parse(source("examples/auto-secure-element/package.json"));
 const root=JSON.parse(source("package.json"));
 const runtime=source("packages/secure-div/src/secure-div.js");
 assert.ok(app.includes("<SecureDiv"));
 assert.ok(!app.includes("{hash&&"));
 assert.equal(pkg.devDependencies["@types/react"],"^19.2.0");
 assert.ok(root.scripts.typecheck.includes("examples/auto-secure-element/tsconfig.json"));
 assert.ok(runtime.includes("attributeChangedCallback"));
 assert.ok(runtime.includes("void this.#restart()"));
});

test("React example uses only SecureDiv JSX with centralized setup",()=>{
 const demo=source("examples/auto-secure-element/react/App.tsx");
 const setup=source("examples/auto-secure-element/react/setup.js");
 const packager=source("tools/package-dom-element.mjs");
 const pkg=JSON.parse(source("packages/secure-div/package.json"));
 assert.ok(demo.includes('<SecureDiv className="secure-card" onSecureStateChange={onSecureStateChange}>'));
 assert.ok(demo.includes('id="react-drm-status"'));
 assert.ok(demo.includes("useSecureDisplayStatus"));
 assert.ok(!demo.includes("assetId="));
 assert.ok(!demo.includes("sourceSha256="));
 assert.ok(!demo.includes("playbackAdapter="));
 assert.ok(!demo.includes("useEffect("));
 assert.ok(setup.includes("configureSecureDisplay({resolveAsset,playbackAdapter})"));
 assert.ok(packager.includes("domSha256,rootClassName"));
 assert.equal(pkg.exports["./secure-div.css"].types,"./types/secure-div.css.d.ts");
});

test("minimal entrypoint never handles DRM asset data, status hook is optional",()=>{
 const entry=source("examples/auto-secure-element/react/main.tsx");
 const app=source("examples/auto-secure-element/react/App.tsx");
 const hook=source("packages/react/src/useSecureDisplayStatus.ts");
 assert.ok(entry.includes('import "./setup.js"'));
 assert.ok(entry.includes('<App />'));
 assert.ok(!app.includes("configureSecureDisplay("));
 assert.ok(!app.includes("assetId="));
 assert.ok(!app.includes("playbackAdapter="));
 assert.ok(!app.includes("useEffect("));
 assert.ok(hook.includes("useSecureDisplayStatus"));
 assert.ok(hook.includes("onSecureStateChange"));
});
