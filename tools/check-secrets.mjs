#!/usr/bin/env node
/** Conservative tracked-file checks; not a substitute for hosted secret scanning. */
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";

const files = execFileSync("git", ["ls-files", "-z"])
  .toString("utf8").split("\0").filter(Boolean);
const bannedNames = /(^|\/)(\.env(?:\.[^/]*)?|secrets|private|\.secure-display-local|FairPlay_Streaming_Server_SDK_[^/]+)(\/|$)|\.(?:pem|p12|pfx|key|jks|keystore)$/i;
const patterns = [
  {name:"private key block", value:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/},
  {name:"GitHub token", value:/\bgh[pousr]_[A-Za-z0-9]{30,}\b/},
  {name:"OpenAI-style API key", value:/\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/},
  {name:"AWS access key", value:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/},
  {name:"Slack token", value:/\bxox[baprs]-[A-Za-z0-9-]{12,}\b/},
];
const findings = [];
for (const file of files) {
  if (bannedNames.test(file)) findings.push(file + ": blocked filename");
  const data = readFileSync(file);
  if (data.includes(0)) continue;
  for (const pattern of patterns) {
    if (pattern.value.test(data.toString("utf8"))) {
      findings.push(file + ": " + pattern.name);
    }
  }
}
if (findings.length) {
  console.error("Potential secrets in tracked files (values omitted):\n" + findings.join("\n"));
  process.exit(1);
}
console.log("No known secret patterns found in " + files.length + " tracked files.");
