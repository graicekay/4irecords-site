/* Run: node --test src/shot-visualizer/optics.test.ts
   Checked against published full-frame figures (DOFMaster, PhotoPills). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { hFov, vFov, distanceForFrame, depthOfField, blurMm } from "./optics.ts";

const near = (a: number, b: number, tol: number) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

test("field of view matches full-frame tables", () => {
  near(hFov(50), 39.6, 0.1);
  near(hFov(24), 73.7, 0.1);
  near(hFov(200), 10.3, 0.1);
  near(vFov(50), 22.9, 0.1); // 16:9 crop of the sensor
});

test("same frame, longer lens, camera further back", () => {
  const close = distanceForFrame(0.35, 24);
  const far = distanceForFrame(0.35, 200);
  near(far / close, 200 / 24, 0.01); // distance scales with focal length
  near(distanceForFrame(1, 50), 2.47, 0.01);
});

test("depth of field: 50mm f/2 at 3m", () => {
  const d = depthOfField(50, 2, 3);
  near(d.near, 2.80, 0.01);
  near(d.far, 3.23, 0.01);
});

test("past hyperfocal, far limit is infinity", () => {
  const d = depthOfField(24, 11, 5);
  near(d.hyperfocal, 1.77, 0.02);
  assert.equal(d.far, Infinity);
});

test("blur is zero at focus and grows away from it", () => {
  assert.equal(blurMm(85, 1.8, 2, 2), 0);
  assert.ok(blurMm(85, 1.8, 2, 10) > blurMm(85, 1.8, 2, 4));
  assert.ok(blurMm(85, 1.8, 2, 10) > blurMm(85, 8, 2, 10)); // stopping down sharpens
});
