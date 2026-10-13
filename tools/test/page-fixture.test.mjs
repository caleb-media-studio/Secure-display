import test from "node:test";
import assert from "node:assert/strict";
import {TEST_SENTENCE,PAGE_WIDTH,PAGE_HEIGHT,BUTTON_BOX,wrapWords,assertSupportedGlyphs,rasterize,rasterizeBlack,rasterizeProbe,rasterizeWhite} from "../generate-protected-page-video.mjs";
import {packagedPageFiles} from "../package-test-page.mjs";
import {readFileSync} from "node:fs";
test("user requested sentence is preserved exactly, including capitalization",()=>{
 assert.equal(TEST_SENTENCE,"This page is protected by Security Display GitHub repo, and this is a test.");
 assert.deepEqual(wrapWords(TEST_SENTENCE).join(" "),TEST_SENTENCE);
 assert.equal(wrapWords(TEST_SENTENCE).length,3);
 assert.doesNotThrow(()=>assertSupportedGlyphs(TEST_SENTENCE));
});
test("renderer outputs a full-size 1280x720 RGB page with a clickable region",()=>{
 const frame=rasterize();
 assert.equal(frame.length,PAGE_WIDTH*PAGE_HEIGHT*3);
 assert.ok(BUTTON_BOX.x+BUTTON_BOX.width<PAGE_WIDTH);
 assert.ok(BUTTON_BOX.y+BUTTON_BOX.height<PAGE_HEIGHT);
});
test("browser manifests use local encrypted HLS/DASH paths, not clear MP4",()=>{
 const files=packagedPageFiles();
 assert.equal(files.hls,"/drm-page/master.m3u8");
 assert.equal(files.dash,"/drm-page/master.mpd");
 assert.ok(!Object.values(files).some(p=>p.endsWith(".mp4")));
});

test("default DRM overlay source is featureless black RGB with no glyphs",()=>{
 const black=rasterizeBlack();
 assert.equal(black.length,PAGE_WIDTH*PAGE_HEIGHT*3);
 assert.ok(black.every(channel=>channel===0),"Black DRM media frame must not contain text or graphics");
 const legacyGraphic=rasterize();
 assert.ok(legacyGraphic.some(channel=>channel!==0),"Graphic rasterization is an optional separate control, not the overlay");
});
test("package script writes a solid black fixture marker for browser freshness validation",()=>{
 const fs=requireNothing();
 assert.ok(fs.includes('"solid-black-v1"'));
 assert.ok(fs.includes('fixture-info.json'));
});
function requireNothing(){
 const file=new URL("../package-test-page.mjs",import.meta.url);
 return readFileSync(file,"utf8");
}

test("color probe is nonblack, distinct from the black overlay, and deterministic",()=>{
 const probe=rasterizeProbe();
 const black=rasterizeBlack();
 assert.equal(probe.length,PAGE_WIDTH*PAGE_HEIGHT*3);
 assert.ok(probe.some(channel=>channel>230),"Probe must be bright enough for screenshot comparison.");
 assert.notDeepEqual(probe.subarray(0,30),black.subarray(0,30));
 assert.deepEqual(rasterizeProbe(),probe);
});
test("package script provides the same clear control and encrypted probe",()=>{
 const source=readFileSync(new URL("../package-test-page.mjs",import.meta.url),"utf8");
 assert.ok(source.includes('protected-probe-clear.mp4'));
 assert.ok(source.includes('drm-probe'));
 assert.ok(source.includes('color-probe-v1'));
 assert.ok(source.includes('probe-clear.mp4'));
});

test("neutral DRM source is fully white for multiply blending",()=>{
 const white=rasterizeWhite();
 assert.equal(white.length,PAGE_WIDTH*PAGE_HEIGHT*3);
 assert.ok(white.every(v=>v===255),"White encrypted source must be a neutral white plane");
 assert.notDeepEqual(white.subarray(0,64),rasterizeBlack().subarray(0,64));
 const packageScript=readFileSync(new URL("../package-test-page.mjs",import.meta.url),"utf8");
 assert.match(packageScript,/protected-white-clear.mp4/);
 assert.match(packageScript,/solid-white-v1/);
 assert.match(packageScript,/drm-white/);
});
