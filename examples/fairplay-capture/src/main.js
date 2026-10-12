import shaka from "shaka-player";
import {
  PUBLIC_TOKEN_SOURCE, TEST_STREAMS, DRM_ENDPOINTS,
  extractPublishedEntitlement, safePlaybackError, selectDefaultDrm,
} from "./public-vectors.js";

/**
 * Real, independently hosted DRM test media. Does not use protected user
 * data. Fetches only a PUBLIC demonstration entitlement at runtime.
 * Credentials and key material are not included in Secure Display source.
 */
const video = document.querySelector("#video");
const start = document.querySelector("#start");
const stop = document.querySelector("#stop");
const status = document.querySelector("#status");
const events = document.querySelector("#events");
const drmSelect = document.querySelector("#drm-system");
const streamSelect = document.querySelector("#stream-source");
const tokenInput = document.querySelector("#test-token");
drmSelect.value = selectDefaultDrm(navigator.userAgent);
let player = null;
let generation = 0;
let lastReportedSecond = 0;

function log(message) {
  const safe = String(message);
  events.textContent += "[" + new Date().toLocaleTimeString() + "] " + safe + "\n";
}
function report(error, stage) {
  const {category, code, httpStatus} = safePlaybackError(error);
  log(stage + " failed; Shaka category " + (category ?? "unknown") +
    ", code " + (code ?? "unknown") +
    (httpStatus === null ? "" : ", HTTP " + httpStatus) + ".");
  status.textContent = httpStatus === 403
    ? "The test media or DRM service rejected access (HTTP 403). No screenshot conclusion."
    : "DRM playback not established. See diagnostic events; no screenshot conclusion.";
}
async function shutdown() {
  ++generation;
  const old = player;
  player = null;
  video.hidden = true;
  start.disabled = false;
  stop.disabled = true;
  if(old) await old.destroy().catch(() => undefined);
  video.pause();
  video.removeAttribute("src");
  video.load();
}
async function entitlementForTest() {
  if (tokenInput.value.trim()) {
    const value = tokenInput.value.trim();
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) {
      throw new Error("Invalid public test entitlement format.");
    }
    return value;
  }
  log("Fetching Axinom's published PUBLIC test vector (no secrets stored).");
  const response = await fetch(PUBLIC_TOKEN_SOURCE, {
    credentials:"omit", cache:"no-store", signal:AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Public test vector unavailable");
  const value = extractPublishedEntitlement(await response.text());
  if (!value) throw new Error("Published entitlement was not found");
  return value;
}
video.addEventListener("playing",() => {
  log("Video is playing. If frames are visibly moving, test screenshots now.");
});
video.addEventListener("timeupdate",()=>{
  const seconds=Math.floor(video.currentTime);
  if(seconds>=lastReportedSecond+5){
    lastReportedSecond=seconds;
    log("Playback reached "+seconds+" seconds.");
  }
});
video.addEventListener("error",()=>{
  if(video.error) log("Native media element error code "+video.error.code+".");
});
stop.addEventListener("click",()=>{
  void shutdown().then(()=>{status.textContent="Stopped.";log("Stopped.");});
});
start.addEventListener("click",()=>{void startTest();});

async function startTest() {
  await shutdown();
  const run=++generation;
  start.disabled=true;
  stop.disabled=false;
  lastReportedSecond=0;
  events.textContent="";
  const selectedDrm=drmSelect.value;
  const selectedStream=streamSelect.value;
  const drm=DRM_ENDPOINTS[selectedDrm];
  const source=TEST_STREAMS[selectedStream];
  if (!drm || !source) {
    status.textContent="Unknown DRM or test source.";
    await shutdown();
    return;
  }
  status.textContent="Attempting real encrypted media playback with " + selectedDrm + "...";
  try {
    if(!globalThis.isSecureContext) throw Error("HTTPS/localhost required.");
    shaka.polyfill.installAll();
    if(!shaka.Player.isBrowserSupported()) throw Error("Shaka reports unsupported browser.");
    let entitlement;
    try {
      entitlement=await entitlementForTest();
    } catch {
      if(run!==generation) return;
      status.textContent="Could not fetch Axinom's PUBLIC entitlement. Open the linked vector and paste its X-AxDRM-Message value below, then retry.";
      log("Public demo entitlement could not be fetched; check cross-origin permissions or paste it manually.");
      await shutdown();
      return;
    }
    if(run!==generation) return;

    const instance=new shaka.Player();
    player=instance;
    instance.addEventListener("error",event=>{
      if(run!==generation) return;
      report(event.detail,"DRM/streaming");
      video.hidden=true;
      void shutdown();
    });
    await instance.attach(video);
    if(run!==generation) return;
    const advanced=selectedDrm==="fairplay"
      ? {"com.apple.fps": {serverCertificateUri:drm.certificate}}
      : {};
    instance.configure({
      drm:{
        servers:{[drm.keySystem]:drm.license},
        advanced,
      },
      streaming:{
        useNativeHlsForFairPlay: true,
      },
    });
    instance.getNetworkingEngine().registerRequestFilter((type, request)=>{
      if(type!==shaka.net.NetworkingEngine.RequestType.LICENSE) return;
      request.headers ??= {};
      request.headers["X-AxDRM-Message"]=entitlement;
      log("Sent licensed-media request to the public Axinom test server.");
      // Never display the entitlement or challenge body in logs.
    });
    log("Loading "+source.label+". Media is DRM packaged, not a clear MP4.");
    await instance.load(source.manifest);
    if(run!==generation) return;
    const actual=instance.drmInfo()?.keySystem;
    if(actual!==drm.keySystem) {
      throw Error("Expected hardware/browser DRM session was not reported; no clear fallback allowed.");
    }
    log("Shaka-selected EME DRM key system: "+actual+". Screenshot exclusion not established.");
    video.hidden=false;
    // Do not indefinitely await play(), which can remain pending on DRM or gesture gates.
    void video.play().catch(()=>{
      if(run===generation) log("Use the video Play control if autoplay is blocked.");
    });
    status.textContent="DRM session initialized. Confirm moving frames, then screenshot and record; capture exclusion remains to be tested.";
  } catch(error) {
    if(run!==generation) return;
    report(error,"Playback");
    await shutdown();
  }
}
