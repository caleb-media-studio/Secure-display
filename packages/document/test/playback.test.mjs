import test from "node:test";
import assert from "node:assert/strict";
import {startProtectedPage} from "../dist/index.js";
const media={keySystem:"com.apple.fps",format:"hls",manifestUrl:"https://example.test/a.m3u8",licenseUrl:"https://example.test/l",certificateUrl:"https://example.test/c"};
function mockedVideo(){
 const eventHandlers=new Map();
 return {hidden:false,controls:true,paused:false,autoplay:false,
  addEventListener(type,fn){eventHandlers.set(type,fn);},
  removeEventListener(type){eventHandlers.delete(type);},
  pause(){this.paused=true;},
  play(){eventHandlers.get("playing")?.();return Promise.resolve();},
  removeAttribute(){},load(){},
 };
}
function mockedPlayer(keySystem){
 let config,loaded,destroyed=false;
 const player={
  async attach(){},configure(value){config=value;},async load(url){loaded=url;},
  drmInfo(){return keySystem?{keySystem}:null;},
  async destroy(){destroyed=true;},
  addEventListener(){},removeEventListener(){},
 };
 return {player, get:()=>({config,loaded,destroyed})};
}
test("real key-system selection and playing event gate synthetic interaction",async()=>{
 const secure=globalThis.isSecureContext;
 globalThis.isSecureContext=true;
 try {
  const v=mockedVideo(),p=mockedPlayer("com.apple.fps"),states=[];
  const session=await startProtectedPage(v,media,async()=>p.player,undefined,new AbortController().signal,s=>states.push(s));
  await Promise.resolve();
  assert.deepEqual(states,["starting","drm-confirmed","playing"]);
  assert.equal(p.get().config.drm.servers["com.apple.fps"],media.licenseUrl);
  assert.equal(p.get().loaded,media.manifestUrl);
  await session.destroy();
  assert.equal(v.hidden,true);
  assert.equal(p.get().destroyed,true);
 } finally {globalThis.isSecureContext=secure;}
});
test("rejects fallback to clear media or incorrect DRM system",async()=>{
 const secure=globalThis.isSecureContext;
 globalThis.isSecureContext=true;
 try{
  for(const drm of [null,"com.widevine.alpha"]){
   const v=mockedVideo(),p=mockedPlayer(drm);
   await assert.rejects(startProtectedPage(v,media,async()=>p.player,undefined,new AbortController().signal,()=>{}));
   assert.equal(v.hidden,true);
   assert.equal(p.get().destroyed,true);
  }
 } finally {globalThis.isSecureContext=secure;}
});
test("insecure context or cancelled request never initializes player",async()=>{
 const secure=globalThis.isSecureContext;
 globalThis.isSecureContext=false;
 try {
  await assert.rejects(startProtectedPage(mockedVideo(),media,async()=>{throw Error("not called");},undefined,new AbortController().signal,()=>{}));
 } finally {globalThis.isSecureContext=secure;}
 const aborted=new AbortController();aborted.abort();
 await assert.rejects(startProtectedPage(mockedVideo(),media,async()=>{throw Error("not called");},undefined,aborted.signal,()=>{}));
});
