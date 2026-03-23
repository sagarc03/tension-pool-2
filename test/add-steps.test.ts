import { describe, it, expect } from "vitest";
import { computeAddSteps } from "../src/scripts/add-steps.js";

describe("computeAddSteps", () => {
  it("returns empty for count <= 0", () => {
    expect(computeAddSteps(0, 0, 6)).toEqual([]);
    expect(computeAddSteps(-1, 0, 6)).toEqual([]);
  });

  it("returns empty for max <= 0", () => {
    expect(computeAddSteps(3, 0, 0)).toEqual([]);
  });

  it("adds without overflow when space is sufficient", () => {
    const steps = computeAddSteps(3, 0, 6);
    expect(steps).toEqual([
      { type: "add", added: 3, newCount: 3, max: 6 },
    ]);
  });

  it("overflows exactly when filling the pool", () => {
    const steps = computeAddSteps(6, 0, 6);
    expect(steps).toEqual([
      { type: "overflow", added: 6, newCount: 6, max: 6 },
    ]);
  });

  it("overflows then adds remainder", () => {
    // pool size 6, currently 1, adding 10 → add 5 (overflow), add 5 (add)
    const steps = computeAddSteps(10, 1, 6);
    expect(steps).toEqual([
      { type: "overflow", added: 5, newCount: 6, max: 6 },
      { type: "add", added: 5, newCount: 5, max: 6 },
    ]);
  });

  it("handles multiple overflows", () => {
    // pool size 3, currently 0, adding 10 → 3 overflows + 1 add
    const steps = computeAddSteps(10, 0, 3);
    expect(steps).toEqual([
      { type: "overflow", added: 3, newCount: 3, max: 3 },
      { type: "overflow", added: 3, newCount: 3, max: 3 },
      { type: "overflow", added: 3, newCount: 3, max: 3 },
      { type: "add", added: 1, newCount: 1, max: 3 },
    ]);
  });

  it("handles pool already full", () => {
    // pool size 6, currently 6, adding 3 → overflow (0 added), then add 3
    const steps = computeAddSteps(3, 6, 6);
    expect(steps).toEqual([
      { type: "overflow", added: 0, newCount: 6, max: 6 },
      { type: "add", added: 3, newCount: 3, max: 6 },
    ]);
  });

  it("handles adding exactly the remaining space", () => {
    // pool size 6, currently 4, adding 2 → overflow
    const steps = computeAddSteps(2, 4, 6);
    expect(steps).toEqual([
      { type: "overflow", added: 2, newCount: 6, max: 6 },
    ]);
  });

  it("handles pool size of 1", () => {
    const steps = computeAddSteps(3, 0, 1);
    expect(steps).toEqual([
      { type: "overflow", added: 1, newCount: 1, max: 1 },
      { type: "overflow", added: 1, newCount: 1, max: 1 },
      { type: "overflow", added: 1, newCount: 1, max: 1 },
    ]);
  });

  it("single die add without overflow", () => {
    const steps = computeAddSteps(1, 2, 6);
    expect(steps).toEqual([
      { type: "add", added: 1, newCount: 3, max: 6 },
    ]);
  });
});
