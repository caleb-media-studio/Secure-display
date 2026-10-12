#!/usr/bin/env node
/**
 * Generate a synthetic, unencrypted H.264 test clip without FFmpeg drawtext.
 * Fixed strings are rasterized into a temporary PPM with a built-in pixel
 * font. No private records, external text, secrets or network calls.
 * Output is NOT DRM protected and remains screenshot-capturable.
 */
import {spawnSync} from "node:child_process";
import {mkdir, writeFile, rm} from "node:fs/promises";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "fixtures/generated");
const framePath = resolve(outputDir, "frame.ppm");
const output = resolve(outputDir, "synthetic-clear.mp4");
// 5 by 7 uppercase bitmap font. Each slash separates a glyph row.
const font = {
  " ": "00000/00000/00000/00000/00000/00000/00000",
  "-": "00000/00000/00000/11111/00000/00000/00000",
  "0": "01110/10001/10011/10101/11001/10001/01110",
  A: "01110/10001/10001/11111/10001/10001/10001",
  B: "11110/10001/10001/11110/10001/10001/11110",
  C: "01111/10000/10000/10000/10000/10000/01111",
  D: "11110/10001/10001/10001/10001/10001/11110",
  E: "11111/10000/10000/11110/10000/10000/11111",
  H: "10001/10001/10001/11111/10001/10001/10001",
  I: "11111/00100/00100/00100/00100/00100/11111",
  L: "10000/10000/10000/10000/10000/10000/11111",
  M: "10001/11011/10101/10101/10001/10001/10001",
  N: "10001/11001/10101/10011/10001/10001/10001",
  O: "01110/10001/10001/10001/10001/10001/01110",
  P: "11110/10001/10001/11110/10000/10000/10000",
  R: "11110/10001/10001/11110/10100/10010/10001",
  S: "01111/10000/10000/01110/00001/00001/11110",
  T: "11111/00100/00100/00100/00100/00100/00100",
  U: "10001/10001/10001/10001/10001/10001/01110",
  X: "10001/10001/01010/00100/01010/10001/10001",
  Y: "10001/10001/01010/00100/00100/00100/00100",
};
const width = 640, height = 360;
const rgb = Buffer.alloc(width * height * 3);
for (let i = 0; i < rgb.length; i += 3) {
  rgb[i] = 17; rgb[i+1] = 24; rgb[i+2] = 42;
}
function draw(message, y, scale, color) {
  const start = Math.floor((width - message.length * 6 * scale + scale) / 2);
  for (let n = 0; n < message.length; n++) {
    const rows = font[message[n]]?.split("/");
    if (!rows) throw Error("Unknown built-in synthetic font glyph");
    for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) {
      if (rows[row][col] !== "1") continue;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const x = start + n * 6 * scale + col * scale + dx;
        const yy = y + row * scale + dy;
        if (x < 0 || yy < 0 || x >= width || yy >= height) continue;
        const offset = (yy * width + x) * 3;
        rgb[offset] = color[0]; rgb[offset+1] = color[1]; rgb[offset+2] = color[2];
      }
    }
  }
}
draw("SYNTHETIC TEST ONLY", 105, 4, [244,247,250]);
draw("EXAMPLE ID 000000", 165, 3, [112,229,197]);
draw("NOT DRM ENCRYPTED - CAPTURABLE", 285, 2, [255,163,121]);

await mkdir(outputDir, {recursive:true});
try {
  await writeFile(framePath, Buffer.concat([
    Buffer.from("P6\n" + width + " " + height + "\n255\n", "ascii"), rgb,
  ]));
  const result = spawnSync("ffmpeg", [
    "-hide_banner","-loglevel","error","-y",
    "-loop","1","-framerate","2","-i",framePath,
    "-t","3","-an","-c:v","libx264","-preset","veryfast",
    "-crf","25","-pix_fmt","yuv420p","-movflags","+faststart",output,
  ], {encoding:"utf8",timeout:30000});
  if (result.error || result.status !== 0) {
    console.error("FFmpeg with libx264 is required (drawtext is not).");
    if (result.error) console.error(result.error.message);
    if (result.stderr) console.error(result.stderr.trim());
    process.exitCode = 1;
  } else {
    await writeFile(resolve(outputDir,"metadata.json"),JSON.stringify({
      kind:"synthetic-report-video",classification:"synthetic-test-only",
      encrypted:false,captureProtected:false,
      warning:"Not DRM encrypted. Screenshot capture is possible.",
    },null,2)+"\n");
    console.log("Generated unprotected synthetic test video:",output);
  }
} finally {
  await rm(framePath,{force:true});
}
