import test from "node:test";
import assert from "node:assert/strict";
import {TEST_SENTENCE,PAGE_WIDTH,PAGE_HEIGHT,BUTTON_BOX,wrapWords,assertSupportedGlyphs,rasterize} from "../generate-protected-page-video.mjs";
import {packagedPageFiles} from "../package-test-page.mjs";
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
