import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname, join} from "node:path";
import {locateSdkRoot, sdkPathMap, inspectSdk, writeLocalPaths, cargoArgs, main} from "../fps-sdk-local.mjs";

test("uses ignored SDK path and accepts override",()=>{
  assert.equal(locateSdkRoot({repoRoot:"/tmp/repo",env:{}}),"/tmp/repo/FairPlay_Streaming_Server_SDK_27");
  assert.equal(locateSdkRoot({repoRoot:"/tmp/repo",env:{SECURE_DISPLAY_FPS_SDK_PATH:"/private/fps"}}),"/private/fps");
});
test("checks local files without copying SDK credential bytes",()=>{
  const repo=mkdtempSync(join(tmpdir(),"secure-display-fps-"));
  try {
    const root=join(repo,"FairPlay_Streaming_Server_SDK_27");
    assert.equal(inspectSdk(root).ready,false);
    for(const [name,path] of Object.entries(sdkPathMap(root))) {
      if(name==="sdkTestInputs") mkdirSync(path,{recursive:true});
      else {
        mkdirSync(dirname(path),{recursive:true});
        writeFileSync(path,"DO_NOT_COPY_SDK_DATA");
      }
    }
    const result=inspectSdk(root);
    assert.equal(result.ready,true);
    const path=writeLocalPaths(result,repo);
    const json=readFileSync(path,"utf8");
    assert.ok(!json.includes("DO_NOT_COPY_SDK_DATA"));
    assert.ok(JSON.parse(json).certificatePath.endsWith("test_fps_certificate_v27.bin"));
    assert.equal(cargoArgs("build",root)[0],"build");
    assert.equal(cargoArgs("test",root)[0],"test");
    assert.equal(main(["doctor"],{repoRoot:repo,env:{SECURE_DISPLAY_FPS_SDK_PATH:"missing"}}),1);
  } finally {rmSync(repo,{recursive:true,force:true});}
});
