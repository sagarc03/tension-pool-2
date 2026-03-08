import { describe, it, expect } from "vitest";
import { buildPoolContext, ICON_THEMES } from "../src/scripts/pool-context.js";

const mockI18n = {
  localize: (key: string) => key,
  format: (key: string, data: any) => `${key} ${JSON.stringify(data)}`,
};

describe("buildPoolContext", () => {
  it("returns a single noTension icon when diceCount is 0", () => {
    const ctx = buildPoolContext(0, "skull", "left", false, true, mockI18n);
    expect(ctx.icons).toEqual([{ class: "fa-regular fa-skull" }]);
  });

  it("returns tension icons matching diceCount", () => {
    const ctx = buildPoolContext(3, "skull", "left", false, true, mockI18n);
    expect(ctx.icons).toHaveLength(3);
    expect(ctx.icons.every((i) => i.class === "fa-solid fa-skull")).toBe(true);
  });

  it("uses square icon theme", () => {
    const ctx = buildPoolContext(1, "square", "left", false, true, mockI18n);
    expect(ctx.icons[0].class).toBe("fa-solid fa-square-exclamation");
  });

  it("uses thunder icon theme", () => {
    const ctx = buildPoolContext(0, "thunder", "left", false, true, mockI18n);
    expect(ctx.icons[0].class).toBe("fa-solid fa-sun");
  });

  it("falls back to skull for unknown theme", () => {
    const ctx = buildPoolContext(1, "unknown", "left", false, true, mockI18n);
    expect(ctx.icons[0].class).toBe(ICON_THEMES.skull.tension);
  });

  it("sets positionRight true when position is right", () => {
    const ctx = buildPoolContext(0, "skull", "right", false, true, mockI18n);
    expect(ctx.positionRight).toBe(true);
  });

  it("sets positionRight false when position is left", () => {
    const ctx = buildPoolContext(0, "skull", "left", false, true, mockI18n);
    expect(ctx.positionRight).toBe(false);
  });

  it("sets NoTension tooltip when diceCount is 0", () => {
    const ctx = buildPoolContext(0, "skull", "left", false, true, mockI18n);
    expect(ctx.tensionTooltip).toBe("TENSION_POOL.NoTension");
  });

  it("sets TensionCount tooltip with count when diceCount > 0", () => {
    const ctx = buildPoolContext(4, "skull", "left", false, true, mockI18n);
    expect(ctx.tensionTooltip).toContain("TENSION_POOL.TensionCount");
    expect(ctx.tensionTooltip).toContain('"4"');
  });

  it("shows chevron-down and HidePool when not collapsed", () => {
    const ctx = buildPoolContext(0, "skull", "left", false, true, mockI18n);
    expect(ctx.toggleIcon).toBe("fa-solid fa-chevron-down");
    expect(ctx.toggleTooltip).toBe("TENSION_POOL.HidePool");
  });

  it("shows chevron-up and ShowPool when collapsed", () => {
    const ctx = buildPoolContext(0, "skull", "left", true, true, mockI18n);
    expect(ctx.toggleIcon).toBe("fa-solid fa-chevron-up");
    expect(ctx.toggleTooltip).toBe("TENSION_POOL.ShowPool");
  });

  it("passes through isGM correctly", () => {
    expect(buildPoolContext(0, "skull", "left", false, true, mockI18n).isGM).toBe(true);
    expect(buildPoolContext(0, "skull", "left", false, false, mockI18n).isGM).toBe(false);
  });

  it("passes through collapsed correctly", () => {
    expect(buildPoolContext(0, "skull", "left", true, true, mockI18n).collapsed).toBe(true);
    expect(buildPoolContext(0, "skull", "left", false, true, mockI18n).collapsed).toBe(false);
  });
});
