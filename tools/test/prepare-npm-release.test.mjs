import test from "node:test";
import assert from "node:assert/strict";
import {makeReleaseVersion,requireMainPush,prepareManifest} from "../prepare-npm-release.mjs";

const expected={
 GITHUB_ACTIONS:"true",
 GITHUB_REPOSITORY:"caleb-media-studio/Secure-display",
 GITHUB_EVENT_NAME:"push",
 GITHUB_REF:"refs/heads/main",
 GITHUB_RUN_NUMBER:"7",
 GITHUB_RUN_ATTEMPT:"2",
};
const manifest={
 name:"@caleb-media-studio-llc/secure-display",
 version:"0.1.0-alpha.2",
 private:true,
 repository:{url:"git+https://github.com/caleb-media-studio/Secure-display.git"},
 peerDependencies:{react:">=18"},
};
test("auto release creates a distinct valid SemVer prerelease for each run and attempt",()=>{
 assert.equal(makeReleaseVersion("0.1.0-alpha.2","7","2"),"0.1.0-main.7.2");
 assert.equal(makeReleaseVersion("0.1.0","8","1"),"0.1.0-main.8.1");
 assert.equal(makeReleaseVersion("0.1.0-alpha.2","8","2"),"0.1.0-main.8.2");
 assert.throws(()=>makeReleaseVersion("latest","7","1"));
 assert.throws(()=>makeReleaseVersion("0.1.0","0","1"));
});
test("main push restrictions block PRs and forked or manual runs",()=>{
 assert.doesNotThrow(()=>requireMainPush(expected));
 for(const [field,value] of [["GITHUB_REF","refs/heads/feature"],
 ["GITHUB_REPOSITORY","attacker/Secure-display"],["GITHUB_EVENT_NAME","pull_request"],
 ["GITHUB_ACTIONS","false"],["GITHUB_RUN_NUMBER","0"]]){
  assert.throws(()=>requireMainPush({...expected,[field]:value}),field);
 }
});
test("only single intended package is made publishable during CI",()=>{
 const p=prepareManifest(manifest,expected);
 assert.equal(p.name,manifest.name);
 assert.equal(p.version,"0.1.0-main.7.2");
 assert.equal(p.private,undefined);
 assert.deepEqual(p.peerDependencies,{react:">=18"});
 assert.equal(manifest.private,true);
 assert.equal(manifest.version,"0.1.0-alpha.2");
 for(const bad of [
  {...manifest,name:"@caleb-media-studio-llc/react"},
  {...manifest,private:false},
  {...manifest,devDependencies:{"@caleb-media-studio-llc/core":"0.1.0"}},
  {...manifest,dependencies:{"@caleb-media-studio-llc/react":"0.1.0"}}
 ])assert.throws(()=>prepareManifest(bad,expected));
});
