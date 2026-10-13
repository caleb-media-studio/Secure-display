/**
 * One-time synthetic/demo adapter setup. A real app configures its licensed
 * asset service here, not inside each <SecureDiv>. Public test keys ONLY.
 */
import {configureSecureDisplay} from "@secure-display/react";
import {startEncryptedVideo} from "../src/drm-player.js";

const playbackAdapter=async(video,signal,assetId,sourceSha256)=>{
 if(assetId!=="demo-card")throw Error("Unrecognized demo asset.");
 const {player,provider,meta}=await startEncryptedVideo(video,signal,sourceSha256);
 return {destroy:()=>player.destroy(),drm:provider.type,width:meta.width,height:meta.height};
};

const resolveAsset=async(_host,signal)=>{
 const [assetResponse,sourceResponse]=await Promise.all([
  fetch("/secure-asset/asset-info.json",{signal,cache:"no-store"}),
  fetch("/secure-content.html",{signal,cache:"no-store"})
 ]);
 if(!assetResponse.ok)throw Error("Encrypted media not packaged. Run bun run drm:element:package.");
 if(!sourceResponse.ok)throw Error("Synthetic fixture stylesheet is missing.");
 const asset=await assetResponse.json();
 const source=await sourceResponse.text();
 const checksum=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(source));
 const sourceSha256=Array.from(new Uint8Array(checksum),b=>b.toString(16).padStart(2,"0")).join("");
 if(sourceSha256!==asset.sourceSha256)
  throw Error("Stylesheet/source fixture no longer matches encrypted media. Repackage.");
 if(asset.kind!=="automated-dom-drm-v1"||asset.classification!=="synthetic-test-only")
  throw Error("Only synthetic encrypted test media is allowed.");
 const parsed=new DOMParser().parseFromString(source,"text/html");
 const styles=parsed.querySelector("#secure-fixture-style");
 if(!styles)throw Error("Synthetic reference stylesheet was not found.");
 if(!document.querySelector("style[data-secure-reference-styles]")){
  const installed=document.importNode(styles,true);
  installed.setAttribute("data-secure-reference-styles","");
  document.head.appendChild(installed);
 }
 return {
  assetId:asset.assetId,
  sourceSha256:asset.sourceSha256,
  domSha256:asset.domSha256,
  rootClassName:asset.rootClassName,
 };
};

configureSecureDisplay({resolveAsset,playbackAdapter});
