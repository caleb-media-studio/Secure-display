#!/usr/bin/env node
/**
 * Creates a clear, synthetic diagnostic video only. NOT DRM encrypted or capture protected.
 * No report text, external input, URLs or credentials are accepted.
 * Requires FFmpeg on PATH with libx264 and drawtext support.
 */
import {spawnSync} from "node:child_process";
import {mkdir, writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {dirname, resolve} from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "fixtures/generated");
await mkdir(outputDir, {recursive:true});
const output = resolve(outputDir, "synthetic-clear.mp4");
const filter = [
  "drawtext=text='SYNTHETIC TEST ONLY':fontcolor=white:fontsize=56:x=(w-text_w)/2:y=250",
  "drawtext=text='EXAMPLE ID 000000':fontcolor=0x70e5c5:fontsize=36:x=(w-text_w)/2:y=340",
  "drawtext=text='NOT DRM ENCRYPTED - SCREEN CAPTURABLE':fontcolor=0xffa379:fontsize=24:x=(w-text_w)/2:y=610",
].join(",");
const result = spawnSync("ffmpeg", [
  "-hide_banner","-loglevel","error","-y",
  "-f","lavfi","-i","color=c=0x11182a:s=1280x720:r=2",
  "-vf",filter,"-t","3","-an",
  "-c:v","libx264","-preset","veryfast","-crf","25","-pix_fmt","yuv420p",
  "-movflags","+faststart",output,
], {encoding:"utf8",timeout:30000});
if (result.error || result.status !== 0) {
  console.error("FFmpeg failed. Install FFmpeg with libx264 and drawtext enabled.");
  if (result.stderr) console.error(result.stderr.trim());
  process.exit(1);
}
await writeFile(resolve(outputDir,"metadata.json"),JSON.stringify({
  kind:"synthetic-report-video", classification:"synthetic-test-only",
  encrypted:false,captureProtected:false,
  warning:"Never distribute as protected media. DRM packaging and licensing are separate.",
},null,2)+"\n");
console.log("Generated local unprotected synthetic test video:", output);
