import test from "node:test";
import assert from "node:assert/strict";
import {validateDocument,hitTest,select,highlights,caret,limits} from "../dist/index.js";
const page={id:"p1",width:400,height:180,media:{
  keySystem:"com.apple.fps",format:"hls",
  manifestUrl:"https://example.test/video.m3u8",licenseUrl:"https://example.test/license",
  certificateUrl:"https://example.test/cert"},lines:[
  {y:20,height:20,glyphs:[{index:0,x:10,width:10},{index:1,x:20,width:15},{index:2,x:35,width:10}]},
  {y:70,height:20,glyphs:[{index:3,x:10,width:10},{index:4,x:20,width:10}]}]};
const sample={version:1,classification:"synthetic-test-only",pages:[page]};
test("valid synthetic layout contains only geometry and DRM references",()=>{
 const doc=validateDocument(sample);
 assert.deepEqual(limits(doc),{min:0,max:5});
});
test("plaintext fields and confidential classification are forbidden",()=>{
 for(const malformed of [
  {...sample,classification:"confidential"},
  {...sample,text:"private"}, {...sample,pages:[{...page,html:"<p>secret</p>"}]},
  {...sample,pages:[{...page,lines:[{...page.lines[0],text:"secret"}]}]},
  {...sample,pages:[{...page,media:{...page.media,manifestUrl:"http://example.test/v.m3u8"}}]},
  {...sample,pages:[{...page,media:{...page.media,format:"clear"}}]},
  {...sample,pages:[{...page,lines:[{y:20,height:20,glyphs:[{index:0,x:10,width:10},{index:2,x:20,width:10}]}]}]},
 ]) assert.throws(()=>validateDocument(malformed));
});
test("hit-testing yields glyph boundaries on either line",()=>{
 const d=validateDocument(sample);
 assert.equal(hitTest(d,0,2,20),0);
 assert.equal(hitTest(d,0,29,20),2);
 assert.equal(hitTest(d,0,300,20),3);
 assert.equal(hitTest(d,0,17,80),4);
});
test("selection highlights only geometry and normalizes backward ranges",()=>{
 const d=validateDocument(sample);
 assert.deepEqual(select(d,4,1),{start:1,end:4,collapsed:false});
 assert.deepEqual(highlights(d,select(d,4,1)),[
  {page:0,x:20,y:20,width:25,height:20},
  {page:0,x:10,y:70,width:10,height:20}]);
 assert.deepEqual(highlights(d,select(d,2,2)),[]);
 assert.equal(caret(d,20),5);
});
test("multi-page hit testing and selection stay ordered",()=>{
 const next={...page,id:"p2",lines:[{y:20,height:20,glyphs:[{index:5,x:20,width:12}]}]};
 const d=validateDocument({...sample,pages:[page,next]});
 assert.equal(hitTest(d,1,300,20),6);
 assert.deepEqual(highlights(d,select(d,4,6)).map(h=>h.page),[0,1]);
});
