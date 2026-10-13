#!/usr/bin/env node
/**
 * Local-only bridge to Apple's FairPlay Streaming Server SDK 27.
 * Does not read/copy/bundle certificates, provisioning bytes, keys or code.
 */
import {lstatSync, mkdirSync, writeFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {dirname, isAbsolute, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = Object.freeze({
  rustManifest: "Development/Key_Server_Module/Rust/Cargo.toml",
  rustServer: "Development/Key_Server_Module/Rust/src/bin/server.rs",
  rustLocal: "Development/Key_Server_Module/Rust/src/bin/local.rs",
  credentialIndex: "Development/Key_Server_Module/credentials/test_certificates.json",
  certificate: "Development/Key_Server_Module/credentials/test_fps_certificate_v27.bin",
  provisioning: "Development/Key_Server_Module/credentials/test_provisioning_data_v27.bin",
  sdkTestInputs: "Development/Key_Server_Module/Test_Inputs/macOS-AS",
  safariExample: "Development/Client/FairPlay Streaming in Safari/FPS With HLS/fps_safari_hls_example.html",
  swiftManifest: "Development/Key_Server_Module/Swift/Package.swift",
});
const REQUIRED = Object.keys(FILES).filter(x => x !== "swiftManifest");

export function locateSdkRoot({env = process.env, repoRoot = ROOT} = {}) {
  const configured = env.SECURE_DISPLAY_FPS_SDK_PATH;
  return configured
    ? isAbsolute(configured) ? resolve(configured) : resolve(repoRoot, configured)
    : join(repoRoot, "FairPlay_Streaming_Server_SDK_27");
}
export function sdkPathMap(root) {
  return Object.fromEntries(Object.entries(FILES).map(([name, path]) => [name, join(root, path)]));
}
export function inspectSdk(root) {
  const paths = sdkPathMap(root);
  const checks = Object.fromEntries(Object.entries(paths).map(([name, path]) => {
    try {
      const stat = lstatSync(path); // metadata only; NEVER read credentials
      return [name, !stat.isSymbolicLink() &&
        (name === "sdkTestInputs" ? stat.isDirectory() : stat.isFile())];
    } catch { return [name, false]; }
  }));
  return {root, paths, checks, ready: REQUIRED.every(name => checks[name])};
}
export function writeLocalPaths(result, repoRoot = ROOT) {
  if (!result.ready) throw Error("Local FPS SDK checks failed.");
  const dir = join(repoRoot, ".secure-display-local");
  mkdirSync(dir, {recursive:true, mode:0o700});
  const path = join(dir, "fps-sdk-paths.json");
  // Paths only, never file bytes, secrets or license data.
  const content = {
    schema:1, classification:"development-only", sdkRoot:result.root,
    rustManifest:result.paths.rustManifest,
    certificatePath:result.paths.certificate,
    provisioningPath:result.paths.provisioning,
    credentialIndexPath:result.paths.credentialIndex,
    safariExample:result.paths.safariExample,
  };
  writeFileSync(path, JSON.stringify(content,null,2)+"\n", {mode:0o600});
  return path;
}
/** Separate ignored Cargo registry avoids damaged ~/.cargo permissions without sudo/chown. */
export function isolatedCargoHome(repoRoot = ROOT) {
  return join(repoRoot, ".secure-display-local", "cargo-home");
}
export function cargoEnvironment(env = process.env, repoRoot = ROOT) {
  const home = isolatedCargoHome(repoRoot);
  mkdirSync(home, {recursive: true, mode: 0o700});
  return {...env, CARGO_HOME: home};
}
export function cargoArgs(command, root) {
  const manifest = sdkPathMap(root).rustManifest;
  if (command === "build") return ["build","--manifest-path",manifest,"--bins"];
  if (command === "test") return ["test","--manifest-path",manifest];
  throw Error("Unknown Cargo command");
}
function hasCargo() {
  return spawnSync("cargo",["--version"],{
    encoding:"utf8",timeout:5000,stdio:["ignore","pipe","pipe"]
  }).status === 0;
}
function help() {
  console.log(`Secure Display local FairPlay SDK 27 bridge
Usage: node tools/fps-sdk-local.mjs <doctor|paths|build|test>
  doctor    Verify local Apple SDK directory without reading secret data
  paths     Create ignored .secure-display-local/fps-sdk-paths.json (paths only)
  build     Build Apple's Rust KSM binaries with Cargo, inside the SDK
  test      Run Apple's Rust KSM tests inside the SDK
Default location: ./FairPlay_Streaming_Server_SDK_27
Override: SECURE_DISPLAY_FPS_SDK_PATH=/absolute/path/to/sdk
This does not perform DRM video playback or guarantee capture exclusion.`);
}
export function main(argv = process.argv.slice(2), options = {}) {
  const command = argv[0];
  if (!command || ["--help","-h","help"].includes(command)) {help();return 0;}
  if (!["doctor","paths","build","test"].includes(command)) {
    console.error("Unknown command. Run with --help.");return 2;
  }
  const result = inspectSdk(locateSdkRoot(options));
  console.log("Apple SDK location:", result.root);
  for (const [name, ok] of Object.entries(result.checks)) {
    console.log("  " + name + ": " + (ok ? "found" : "missing"));
  }
  if (!result.ready) {
    console.error("Apple SDK 27 is incomplete or missing; nothing was copied.");
    return 1;
  }
  if (command === "doctor") {
    console.log("SDK verified. Cargo:",hasCargo()?"installed":"missing");
    console.log("Development credentials remain local and unread.");
    return 0;
  }
  if (command === "paths") {
    console.log("Local path manifest:",writeLocalPaths(result,options.repoRoot??ROOT));
    return 0;
  }
  if (!hasCargo()) {
    console.error("Rust Cargo is required for Apple's KSM build/tests.");
    return 1;
  }
  console.log("Running Apple's local Rust KSM "+command+" (not video playback).");
  const child = spawnSync("cargo",cargoArgs(command,result.root),{
    cwd:dirname(result.paths.rustManifest), stdio:"inherit", env:cargoEnvironment(process.env,options.repoRoot??ROOT)
  });
  return child.status??1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
