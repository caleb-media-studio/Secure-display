import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("browser capture lab uses genuine HTML, a marked candidate, and user-initiated browser capture",()=>{
 const html=readFileSync(new URL("../../../examples/auto-secure-element/public/capture-test.html",import.meta.url),"utf8");
 assert.match(html,/data-secure-display="capture-lab"/);
 assert.match(html,/Unprotected control/);
 assert.match(html,/getDisplayMedia/);
 assert.match(html,/getVideoTracks/);
 assert.match(html,/canvas\.toBlob/);
 assert.match(html,/supported: false/);
 assert.match(html,/both panes remain capturable/);
 assert.doesNotMatch(html,/setContentProtection|CGSSetWindowCaptureExcludeShape/,
  "Ordinary HTML cannot invoke privileged native screenshot protection");
});
