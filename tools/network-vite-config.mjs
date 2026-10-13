import {existsSync,readFileSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";

/**
 * Shared LAN dev-server config for synthetic-only examples.
 * HTTPS is enabled automatically when locally trusted certificates exist.
 * Never put these private-key files in Vite's public/ directory or Git.
 */
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
export function createNetworkViteConfig({
  env=process.env,
  repoRoot=ROOT,
  exists=existsSync,
  read=readFileSync,
}={}) {
  const defaultCert=resolve(repoRoot,".secure-display-local/tls/cert.pem");
  const defaultKey=resolve(repoRoot,".secure-display-local/tls/key.pem");
  const certPath=env.SECURE_DISPLAY_HTTPS_CERT
    ? resolve(repoRoot,env.SECURE_DISPLAY_HTTPS_CERT):defaultCert;
  const keyPath=env.SECURE_DISPLAY_HTTPS_KEY
    ? resolve(repoRoot,env.SECURE_DISPLAY_HTTPS_KEY):defaultKey;
  const foundCert=exists(certPath),foundKey=exists(keyPath);
  if(foundCert!==foundKey || (Boolean(env.SECURE_DISPLAY_HTTPS_CERT)!==Boolean(env.SECURE_DISPLAY_HTTPS_KEY))) {
    throw Error("HTTPS needs both a certificate and key. Run: bun run network:cert");
  }
  const https=foundCert?{cert:read(certPath),key:read(keyPath)}:undefined;
  return {
    server:{
      host:"0.0.0.0",
      // HTTPS is necessary for real DRM use on another machine's LAN IP.
      https,
      fs:{deny:[
        "**/.env","**/.env.*","**/.git/**","**/.DS_Store",
        "**/.secure-display-local/**",
        "**/FairPlay_Streaming_Server_SDK_*/**",
        "**/secrets/**","**/private/**",
        "**/*.pem","**/*.key","**/*.p12","**/*.pfx",
      ]},
    },
  };
}
