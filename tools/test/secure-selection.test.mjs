import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {selectionGeometry,updateSelectionIndicator} from "../../examples/auto-secure-element/src/selection-geometry.js";

function fixture(){
 const inside={};
 const outside={};
 const range={
  startContainer:inside,endContainer:inside,
  getClientRects(){return [
   {left:100,top:120,right:360,bottom:145},
   {left:95,top:151,right:505,bottom:175},
   {left:250,top:160,right:251,bottom:160},
  ]},
 };
 const selection={isCollapsed:false,rangeCount:1,getRangeAt:()=>range};
 const host={contains:node=>node===inside,
  getBoundingClientRect:()=>({left:110,top:110,right:480,bottom:300,width:370,height:190})};
 return {selection,host,range,outside};
}
test("native selection rectangles clip to protected DOM bounds",()=>{
 const {selection,host}=fixture();
 assert.deepEqual(selectionGeometry(host,selection),[
  {left:110,top:120,width:250,height:25},
  {left:110,top:151,width:370,height:24},
 ]);
});
test("collapsed or foreign DOM selections show no protected highlights",()=>{
 const {selection,host,range,outside}=fixture();
 assert.deepEqual(selectionGeometry(host,{...selection,isCollapsed:true}),[]);
 assert.deepEqual(selectionGeometry(host,{...selection,rangeCount:0}),[]);
 range.endContainer=outside;
 assert.deepEqual(selectionGeometry(host,selection),[]);
});
test("visible selection marker contains rectangles only, never glyph text",()=>{
 const {selection,host}=fixture();
 const rects=selectionGeometry(host,selection);
 const root={replaceChildren(...items){this.nodes=items;}};
 const doc={createElement:()=>({attributes:{},style:{cssText:""},
   setAttribute(k,v){this.attributes[k]=v;}})};
 updateSelectionIndicator(root,rects,doc);
 assert.equal(root.nodes.length,2);
 assert.equal(root.nodes[0].attributes["data-sd-selection-fragment"],"");
 assert.match(root.nodes[0].style.cssText,/pointer-events:none/);
 assert.match(root.nodes[0].style.cssText,/background:rgba/);
 assert.ok(root.nodes.every(n=>n.textContent===undefined));
 updateSelectionIndicator(root,[],doc);
 assert.equal(root.nodes.length,0);
});
test("DOM selection is tracked outside the opaque original host",()=>{
 const el=readFileSync(new URL("../../examples/auto-secure-element/src/secure-div.js",import.meta.url),"utf8");
 const html=readFileSync(new URL("../../examples/auto-secure-element/index.html",import.meta.url),"utf8");
 assert.match(el,/document\.addEventListener\("selectionchange"/);
 assert.match(el,/document\.removeEventListener\("selectionchange"/);
 assert.match(el,/window\.getSelection\(\)/);
 assert.match(el,/secure-selection-change/);
 assert.match(el,/aria-hidden/);
 assert.match(html,/id="selection-status"/);
 assert.match(html,/user-select:text/);
});
