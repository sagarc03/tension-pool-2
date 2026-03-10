import { describe, it, expect } from "vitest";
import { buildPoolContext, ICON_THEMES } from "../src/scripts/pool-context.js";

const mockI18n = {
  localize: (key: string) => key,
  format: (key: string, data: any) => `${key} ${JSON.stringify(data)}`,
};

describe("buildPoolContext", () => {
  it("returns a single noTension icon when diceCount is 0", () => {
    const ctx = buildPoolContext(0, "skull", false, true, mockI18n);
    expect(ctx.icons).toEqual([{ class: "fa-regular fa-skull" }]);
  });

  it("returns tension icons matching diceCount", () => {
    const ctx = buildPoolContext(3, "skull", false, true, mockI18n);
    expect(ctx.icons).toHaveLength(3);
    expect(ctx.icons.every((i) => i.class === "fa-solid fa-skull")).toBe(true);
  });

  it("uses square icon theme", () => {
    const ctx = buildPoolContext(1, "square", false, true, mockI18n);
    expect(ctx.icons[0].class).toBe("fa-solid fa-square-exclamation");
  });

  it("uses thunder icon theme", () => {
    const ctx = buildPoolContext(0, "thunder", false, true, mockI18n);
    expect(ctx.icons[0].class).toBe("fa-solid fa-sun");
  });

  it("falls back to skull for unknown theme", () => {
    const ctx = buildPoolContext(1, "unknown", false, true, mockI18n);
    expect(ctx.icons[0].class).toBe(ICON_THEMES.skull.tension);
  });

  it("sets NoTension tooltip when diceCount is 0", () => {
    const ctx = buildPoolContext(0, "skull", false, true, mockI18n);
    expect(ctx.tensionTooltip).toBe("TENSION_POOL.NoTension");
  });

  it("sets TensionCount tooltip with count when diceCount > 0", () => {
    const ctx = buildPoolContext(4, "skull", false, true, mockI18n);
    expect(ctx.tensionTooltip).toContain("TENSION_POOL.TensionCount");
    expect(ctx.tensionTooltip).toContain('"4"');
  });

  it("shows chevron-down and Compact tooltip when expanded", () => {
    const ctx = buildPoolContext(0, "skull", false, true, mockI18n);
    expect(ctx.toggleIcon).toBe("fa-solid fa-chevron-down");
    expect(ctx.toggleTooltip).toBe("TENSION_POOL.Compact");
  });

  it("shows chevron-up and Expand tooltip when collapsed", () => {
    const ctx = buildPoolContext(0, "skull", true, true, mockI18n);
    expect(ctx.toggleIcon).toBe("fa-solid fa-chevron-up");
    expect(ctx.toggleTooltip).toBe("TENSION_POOL.Expand");
  });

  it("passes through isGM correctly", () => {
    expect(buildPoolContext(0, "skull", false, true, mockI18n).isGM).toBe(true);
    expect(buildPoolContext(0, "skull", false, false, mockI18n).isGM).toBe(false);
  });

  it("passes through collapsed correctly", () => {
    expect(buildPoolContext(0, "skull", true, true, mockI18n).collapsed).toBe(true);
    expect(buildPoolContext(0, "skull", false, true, mockI18n).collapsed).toBe(false);
  });

  it("includes diceCount in context", () => {
    expect(buildPoolContext(5, "skull", false, true, mockI18n).diceCount).toBe(5);
    expect(buildPoolContext(0, "skull", false, true, mockI18n).diceCount).toBe(0);
  });

  it("uses tension icon for compactDisplayIcon when diceCount > 0", () => {
    const ctx = buildPoolContext(3, "skull", true, true, mockI18n);
    expect(ctx.compactDisplayIcon).toBe("fa-solid fa-skull");
  });

  it("uses noTension icon for compactDisplayIcon when diceCount is 0", () => {
    const ctx = buildPoolContext(0, "skull", true, true, mockI18n);
    expect(ctx.compactDisplayIcon).toBe("fa-regular fa-skull");
  });

  it("uses correct compactDisplayIcon for square theme", () => {
    const ctx = buildPoolContext(1, "square", true, true, mockI18n);
    expect(ctx.compactDisplayIcon).toBe("fa-solid fa-square-exclamation");
  });

  it("falls back to skull compactDisplayIcon for unknown theme", () => {
    const ctx = buildPoolContext(1, "unknown", true, true, mockI18n);
    expect(ctx.compactDisplayIcon).toBe(ICON_THEMES.skull.tension);
  });
});
