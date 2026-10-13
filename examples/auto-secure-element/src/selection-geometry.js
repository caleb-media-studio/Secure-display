/**
 * Native DOM Range -> a text-free selection indicator.
 *
 * The original protected DOM is opacity:0; browser selection still exists,
 * but its highlight is equally transparent. We visualize only the range's
 * rectangles OUTSIDE that subtree, over the encrypted-media video portal.
 *
 * IMPORTANT: Those rectangles are normal DOM and can appear in screenshots.
 * They contain NO character pixels or selected text, but reveal selection
 * bounds/line lengths. Do not claim the selection indicator itself is DRM.
 */
export function selectionGeometry(host,selection,maxRects=160){
 if(!host||!selection||selection.isCollapsed||selection.rangeCount!==1)return [];
 const range=selection.getRangeAt(0);
 // Deliberately limit V1 to selections entirely within one protected host.
 // Never paint an indicator for unrelated normal DOM or cross-boundary ranges.
 if(!host.contains(range.startContainer)||!host.contains(range.endContainer))
   return [];
 const bounds=host.getBoundingClientRect();
 if(bounds.width<=0||bounds.height<=0)return [];
 const output=[];
 for(const rect of Array.from(range.getClientRects()).slice(0,maxRects)){
  const left=Math.max(bounds.left,rect.left);
  const top=Math.max(bounds.top,rect.top);
  const right=Math.min(bounds.right,rect.right);
  const bottom=Math.min(bounds.bottom,rect.bottom);
  if(right-left<1||bottom-top<1)continue;
  output.push({left,top,width:right-left,height:bottom-top});
 }
 return output;
}

export function updateSelectionIndicator(root,rects,doc=document){
 const nodes=rects.map(rect=>{
  const node=doc.createElement("div");
  node.setAttribute("data-sd-selection-fragment","");
  node.style.cssText=[
   "position:absolute","pointer-events:none",
   "background:rgba(85,159,255,.40)",
   "box-shadow:inset 0 0 0 1px rgba(176,220,255,.72)",
   "border-radius:2px",
   "left:"+rect.left+"px","top:"+rect.top+"px",
   "width:"+rect.width+"px","height:"+rect.height+"px",
  ].join(";");
  return node;
 });
 root.replaceChildren(...nodes);
}
