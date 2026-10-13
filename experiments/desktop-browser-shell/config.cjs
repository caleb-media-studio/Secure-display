"use strict";
const DEFAULT_URL="https://localhost:5173/react/";
function getLabConfig(env=process.env){
 const url=new URL(env.SECURE_DISPLAY_LAB_URL || DEFAULT_URL);
 if(!["http:","https:"].includes(url.protocol))
  throw Error("Secure Display lab accepts only HTTP(S) pages.");
 // Non-local HTTP has no secure context for normal EME use and is blocked.
 if(url.protocol==="http:"&&!["localhost","127.0.0.1","[::1]"].includes(url.hostname))
  throw Error("Plain HTTP is only permitted on localhost.");
 if(url.username||url.password)
  throw Error("Never place credentials in the lab URL.");
 const mode=env.SECURE_DISPLAY_CAPTURE_PROTECTION||"off";
 if(!["off","on"].includes(mode))
  throw Error("SECURE_DISPLAY_CAPTURE_PROTECTION must be 'off' or 'on'.");
 return {url:url.href,captureProtection:mode==="on"};
}
module.exports={getLabConfig,DEFAULT_URL};
