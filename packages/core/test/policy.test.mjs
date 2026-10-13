import test from "node:test";
import assert from "node:assert/strict";
import { evaluateDisplayPolicy } from "../dist/index.js";
const probe={kind:"playready-sl3000",keySystem:"mock",contentType:"video/mp4",initDataTypes:["cenc"],status:"candidate",captureExclusionVerified:false,explanation:"mock"};
test("strict policy never reveals content despite positive EME probe",()=>{
  assert.equal(evaluateDisplayPolicy("capture-exclusion-required",[probe]).status,"blocked");
});
test("synthetic tests block unsupported devices",()=>{
  assert.equal(evaluateDisplayPolicy("synthetic-drm-lab",[]).status,"blocked");
});
test("synthetic lab only approves synthetic experiment",()=>{
  assert.equal(evaluateDisplayPolicy("synthetic-drm-lab",[probe]).status,"synthetic-test-allowed");
});
