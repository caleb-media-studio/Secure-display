"use strict";
// Standalone experiment. Do not load into the public npm library or production.
// Use Castlabs Electron for Content Security to make Widevine available.
const {app,BrowserWindow,components}=require("electron");
const {getLabConfig}=require("./config.cjs");
const configuration=getLabConfig(process.env);
app.whenReady().then(async()=>{
 // Castlabs ECS installs a licensed CDM through its component updater.
 // Stock Electron may not expose Widevine. Do not copy Chrome CDM binaries.
 if(components?.whenReady)await components.whenReady();
 const window=new BrowserWindow({
  width:1250,height:870,
  title:"Secure Display: native capture lab",
  webPreferences:{
   contextIsolation:true,
   sandbox:true,
   nodeIntegration:false,
   webSecurity:true
  }
 });
 // Window-level OS API; NOT a per-DOM-element or Widevine capability.
 // Windows: WDA_EXCLUDEFROMCAPTURE. macOS: NSWindowSharingNone,
 // not reliable against current ScreenCaptureKit capture paths.
 window.setContentProtection(configuration.captureProtection);
 window.webContents.on("did-fail-load",(_event,code,reason,url)=>{
  console.error("Navigation failed",code,reason,url);
 });
 window.webContents.on("console-message",(_event,details)=>{
  if(details?.level==="error")console.warn("Page console:",details.message);
 });
 console.log("Native capture protection:",configuration.captureProtection?"ON":"OFF");
 console.log("Target URL:",configuration.url);
 console.log("Compare physical screen, OS screenshot, screen recording, and sharing.");
 await window.loadURL(configuration.url);
}).catch(error=>{
 console.error("Unable to open Secure Display native browser lab:",error);
 app.quit();
});
app.on("window-all-closed",()=>app.quit());
