import type { MediaDescriptor } from "./geometry.js";

/** Small Shaka-compatible surface; application supplies the licensed player. */
export interface DRMPlayer {
  attach(video:HTMLVideoElement):Promise<void>;
  configure(options:unknown):void;
  load(url:string):Promise<void>;
  drmInfo():{keySystem:string}|null;
  destroy():Promise<void>;
  addEventListener(type:"error",callback:EventListener):void;
  removeEventListener(type:"error",callback:EventListener):void;
}
export interface PageSession { destroy():Promise<void> }
export type PageState="starting"|"drm-confirmed"|"playing"|"blocked";
export type PlayerFactory=()=>Promise<DRMPlayer>;
export type PlayerSetup=(player:DRMPlayer,media:MediaDescriptor,signal:AbortSignal)=>Promise<void>|void;
/**
 * Synthetic-only browser DRM playback. Reuses the browser CDM and protected
 * video pipeline; NEVER draws decrypted frames to canvas. In particular,
 * drmInfo() is not proof of screenshot exclusion on every capture engine.
 */
export async function startProtectedPage(
  video:HTMLVideoElement,
  media:MediaDescriptor,
  createPlayer:PlayerFactory,
  preparePlayer:PlayerSetup|undefined,
  signal:AbortSignal,
  onStatus:(state:PageState)=>void,
):Promise<PageSession> {
  video.hidden=true;
  video.controls=false;
  video.autoplay=true;
  video.loop=true;
  video.muted=true;
  video.playsInline=true;
  video.disablePictureInPicture=true;
  video.disableRemotePlayback=true;
  if(signal.aborted || globalThis.isSecureContext!==true) throw Error("DRM playback requires HTTPS and an active request.");
  let player:DRMPlayer|undefined;
  let destroyed=false;
  const block=()=>{
    if(destroyed) return;
    video.hidden=true;
    video.pause();
    onStatus("blocked");
  };
  const onError:EventListener=()=>block();
  const onPlaying=()=>{
    if(!destroyed && !signal.aborted) onStatus("playing");
  };
  const cleanup=async()=>{
    if(destroyed) return;
    destroyed=true;
    video.hidden=true;
    video.pause();
    video.removeEventListener("playing",onPlaying);
    video.removeEventListener("error",onError);
    if(player) {
      player.removeEventListener("error",onError);
      await player.destroy().catch(()=>undefined);
    }
    video.removeAttribute("src");
    video.load();
  };
  video.addEventListener("playing",onPlaying);
  video.addEventListener("error",onError);
  try {
    onStatus("starting");
    player=await createPlayer();
    if(signal.aborted) throw Error("Cancelled");
    player.addEventListener("error",onError);
    await player.attach(video);
    const advanced=media.certificateUrl
      ? {[media.keySystem]:{serverCertificateUri:media.certificateUrl}}:{};
    player.configure({
      drm:{servers:{[media.keySystem]:media.licenseUrl},advanced},
      streaming:{useNativeHlsForFairPlay:media.keySystem==="com.apple.fps"},
    });
    if(preparePlayer) await preparePlayer(player,media,signal);
    if(signal.aborted) throw Error("Cancelled");
    await player.load(media.manifestUrl);
    if(signal.aborted || player.drmInfo()?.keySystem!==media.keySystem)
      throw Error("Protected DRM session not established.");
    onStatus("drm-confirmed");
    video.hidden=false;
    // The component is interactive only after the media dispatches "playing".
    void video.play().catch(()=>block());
    return {destroy:cleanup};
  } catch {
    await cleanup();
    throw Error("Synthetic DRM page playback failed.");
  }
}
