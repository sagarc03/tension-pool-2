import "../styles/module.css";
import { TensionPoolApp, ICON_THEMES } from "./tension-pool-app.js";
import { registerTensionDie, registerDiceSoNice } from "./tension-die.js";

if (import.meta.env.DEV) {
  import("./quench.js");
}

let poolApp: TensionPoolApp | null = null;

Hooks.once("init", () => {
  console.log("Tension Pool 2 | Initializing");

  registerTensionDie();

  (game as Game).settings!.register("tension-pool-2" as any, "position" as any, {
    name: "TENSION_POOL.Settings.Position.Name",
    hint: "TENSION_POOL.Settings.Position.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      left: "TENSION_POOL.Settings.Position.Left",
      right: "TENSION_POOL.Settings.Position.Right",
    },
    default: "left",
    onChange: () => {
      poolApp?.render({ force: true });
    },
  } as any);

  (game as Game).settings!.register("tension-pool-2" as any, "poolSize" as any, {
    name: "TENSION_POOL.Settings.PoolSize.Name",
    hint: "TENSION_POOL.Settings.PoolSize.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 6,
    range: { min: 1, max: 20, step: 1 },
    onChange: () => {
      poolApp?.render({ force: true });
    },
  } as any);

  (game as Game).settings!.register("tension-pool-2" as any, "iconTheme" as any, {
    name: "TENSION_POOL.Settings.IconTheme.Name",
    hint: "TENSION_POOL.Settings.IconTheme.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      skull: "TENSION_POOL.Settings.IconTheme.Skull",
      square: "TENSION_POOL.Settings.IconTheme.Square",
      thunder: "TENSION_POOL.Settings.IconTheme.Thunder",
    },
    default: "skull",
    onChange: () => {
      poolApp?.render({ force: true });
    },
  } as any);

  (game as Game).settings!.register("tension-pool-2" as any, "diceSize" as any, {
    name: "TENSION_POOL.Settings.DiceSize.Name",
    hint: "TENSION_POOL.Settings.DiceSize.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      d4: "d4",
      d6: "d6",
      d8: "d8",
      d10: "d10",
      d12: "d12",
      d20: "d20",
    },
    default: "d6",
    onChange: () => {
      (ui as any).notifications?.info(game.i18n!.localize("TENSION_POOL.Settings.DiceSize.RefreshRequired"));
    },
  } as any);

  (game as Game).settings!.register("tension-pool-2" as any, "complicationMacro" as any, {
    name: "TENSION_POOL.Settings.ComplicationMacro.Name",
    hint: "TENSION_POOL.Settings.ComplicationMacro.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "",
  } as any);

  (game as Game).settings!.register("tension-pool-2" as any, "diceCount" as any, {
    scope: "world",
    config: false,
    type: Number,
    default: 0,
    onChange: () => {
      poolApp?.render({ force: true });
    },
  } as any);

  (game as Game).settings!.register("tension-pool-2" as any, "collapsed" as any, {
    scope: "client",
    config: false,
    type: Boolean,
    default: false,
    onChange: () => {
      poolApp?.render({ force: true });
    },
  } as any);
});

// @ts-expect-error — diceSoNiceReady is registered by Dice So Nice at runtime
Hooks.once("diceSoNiceReady", (dice3d: any) => {
  registerDiceSoNice(dice3d);
});

// Resolve tension icons in chat messages based on each client's icon theme
Hooks.on("renderChatMessage", (_message: any, html: any) => {
  const icons = html[0]?.querySelectorAll?.("[data-tp-icon]")
    ?? html.querySelectorAll?.("[data-tp-icon]")
    ?? [];
  if (!icons.length) return;

  const theme = (game as Game).settings!.get("tension-pool-2" as any, "iconTheme" as any) as string;
  const iconSet = ICON_THEMES[theme] ?? ICON_THEMES.skull;

  for (const el of icons) {
    const type = el.getAttribute("data-tp-icon") as "tension" | "noTension";
    const classes = iconSet[type];
    if (classes) {
      classes.split(" ").forEach((cls: string) => el.classList.add(cls));
    }
  }
});

// Run configured macros on complication
// @ts-expect-error — custom hook not in Foundry's HookConfig
Hooks.on("tensionPoolComplication", (result: any) => {
  if (!(game as Game).user!.isGM) return;
  const setting = (game as Game).settings!.get("tension-pool-2" as any, "complicationMacro" as any) as string;
  if (!setting) return;
  const macroNames = setting.split(",").map((s: string) => s.trim()).filter(Boolean);
  for (const name of macroNames) {
    const macro = (game as Game).macros!.find((m: any) => m.name === name);
    if (macro) {
      macro.execute({ tensionResult: result } as any);
    } else {
      (ui as any).notifications?.warn(
        game.i18n!.format("TENSION_POOL.Settings.ComplicationMacro.NotFound", { name })
      );
    }
  }
});

Hooks.on("ready", () => {
  poolApp = new TensionPoolApp();
  poolApp.render({ force: true });
});
