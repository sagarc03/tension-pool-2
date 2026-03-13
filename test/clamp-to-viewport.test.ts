import { describe, it, expect } from "vitest";
import { clampToViewport, pctToPixels, pixelsToPct } from "../src/scripts/clamp-to-viewport";

describe("clampToViewport", () => {
  const vp = { w: 1920, h: 1080 };
  const elW = 200;

  it("returns position unchanged when fully within viewport", () => {
    const result = clampToViewport(500, 300, elW, vp.w, vp.h);
    expect(result).toEqual({ left: 500, top: 300 });
  });

  it("clamps left when element is too far right", () => {
    const result = clampToViewport(1900, 300, elW, vp.w, vp.h);
    expect(result.left).toBe(vp.w - 40);
  });

  it("clamps left when element is too far left", () => {
    const result = clampToViewport(-300, 300, elW, vp.w, vp.h);
    // MIN_VISIBLE_PX (40) - elWidth (200) = -160
    expect(result.left).toBe(40 - elW);
  });

  it("clamps top to 0 when above viewport", () => {
    const result = clampToViewport(500, -50, elW, vp.w, vp.h);
    expect(result.top).toBe(0);
  });

  it("clamps top when element is below viewport", () => {
    const result = clampToViewport(500, 1100, elW, vp.w, vp.h);
    expect(result.top).toBe(vp.h - 40);
  });

  it("handles smaller viewport (screen size switch)", () => {
    const result = clampToViewport(1800, 900, elW, 1366, 768);
    expect(result.left).toBe(1366 - 40);
    expect(result.top).toBe(768 - 40);
  });

  it("rounds to whole pixels", () => {
    const result = clampToViewport(100, 200, elW, vp.w, vp.h);
    expect(Number.isInteger(result.left)).toBe(true);
    expect(Number.isInteger(result.top)).toBe(true);
  });
});

describe("pctToPixels", () => {
  it("converts percentages to pixel positions", () => {
    const result = pctToPixels(0.5, 0.25, 1920, 1080);
    expect(result).toEqual({ left: 960, top: 270 });
  });

  it("handles 0% (top-left corner)", () => {
    const result = pctToPixels(0, 0, 1920, 1080);
    expect(result).toEqual({ left: 0, top: 0 });
  });

  it("handles 100% (bottom-right corner)", () => {
    const result = pctToPixels(1, 1, 1920, 1080);
    expect(result).toEqual({ left: 1920, top: 1080 });
  });

  it("rounds to whole pixels", () => {
    const result = pctToPixels(0.333, 0.666, 1000, 1000);
    expect(Number.isInteger(result.left)).toBe(true);
    expect(Number.isInteger(result.top)).toBe(true);
  });
});

describe("pixelsToPct", () => {
  it("converts pixel positions to percentages", () => {
    const result = pixelsToPct(960, 540, 1920, 1080);
    expect(result).toEqual({ leftPct: 0.5, topPct: 0.5 });
  });

  it("preserves relative position across screen sizes", () => {
    // Save at 50% on a 1920x1080 screen
    const pct = pixelsToPct(960, 540, 1920, 1080);
    // Restore on a 1366x768 screen
    const restored = pctToPixels(pct.leftPct, pct.topPct, 1366, 768);
    expect(restored).toEqual({ left: 683, top: 384 });
  });

  it("handles zero-size viewport gracefully", () => {
    const result = pixelsToPct(100, 200, 0, 0);
    expect(result).toEqual({ leftPct: 0.5, topPct: 0.5 });
  });

  it("roundtrips through pctToPixels", () => {
    const pct = pixelsToPct(500, 300, 1920, 1080);
    const pixels = pctToPixels(pct.leftPct, pct.topPct, 1920, 1080);
    expect(pixels.left).toBeCloseTo(500, 0);
    expect(pixels.top).toBeCloseTo(300, 0);
  });
});
