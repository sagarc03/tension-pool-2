import "../styles/module.css";
import { TensionPoolApp, ICON_THEMES } from "./tension-pool-app.js";
import { registerTensionDie, registerDiceSoNice } from "./tension-die.js";
import { MODULE_ID, getSetting, setSetting, registerSetting } from "./constants.js";
import { showBanner } from "./announcements.js";
import { createTensionPoolAPI } from "./api.js";

function getModuleVersion(): string {
  return (game as Game).modules!.get(MODULE_ID)?.version ?? "0.0.0";
}

if (import.meta.env.DEV) {
  import("./quench.js");
}

let poolApp: TensionPoolApp | null = null;

Hooks.once("init", () => {
  console.log("Tension Pool 2 | Initializing");

  registerTensionDie();

  registerSetting("windowPosition", {
    scope: "client",
    config: false,
    type: Object,
    default: null,
  });

  registerSetting("poolSize", {
    name: "TENSION_POOL.Settings.PoolSize.Name",
    hint: "TENSION_POOL.Settings.PoolSize.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 6,
    range: { min: 1, max: 20, step: 1 },
    onChange: () => {
      poolApp?.debouncedRender();
    },
  });

  registerSetting("iconTheme", {
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
    requiresReload: true,
  });

  registerSetting("diceSize", {
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
    requiresReload: true,
  });

  registerSetting("rollVisibility", {
    name: "TENSION_POOL.Settings.RollVisibility.Name",
    hint: "TENSION_POOL.Settings.RollVisibility.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      public: "TENSION_POOL.Settings.RollVisibility.Public",
      gmOnly: "TENSION_POOL.Settings.RollVisibility.GMOnly",
    },
    default: "public",
  });

  registerSetting("complicationMacro", {
    name: "TENSION_POOL.Settings.ComplicationMacro.Name",
    hint: "TENSION_POOL.Settings.ComplicationMacro.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  registerSetting("diceCount", {
    scope: "world",
    config: false,
    type: Number,
    default: 0,
    onChange: () => {
      poolApp?.debouncedRender();
    },
  });

  registerSetting("collapsed", {
    scope: "client",
    config: false,
    type: Boolean,
    default: false,
    onChange: () => {
      poolApp?.debouncedRender();
    },
  });

  registerSetting("soundEnabled", {
    name: "TENSION_POOL.Settings.SoundEnabled.Name",
    hint: "TENSION_POOL.Settings.SoundEnabled.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  registerSetting("addDieSound", {
    name: "TENSION_POOL.Settings.AddDieSound.Name",
    hint: "TENSION_POOL.Settings.AddDieSound.Hint",
    scope: "world",
    config: true,
    type: String,
    filePicker: "audio",
    default: "modules/tension-pool-2/assets/sounds/freesound_community-pearl-mlx-16-floor-tom-104999.mp3",
  });

  registerSetting("removeDieSound", {
    name: "TENSION_POOL.Settings.RemoveDieSound.Name",
    hint: "TENSION_POOL.Settings.RemoveDieSound.Hint",
    scope: "world",
    config: true,
    type: String,
    filePicker: "audio",
    default: "modules/tension-pool-2/assets/sounds/diogodasilvasimoes-magical-notification-tone-soft-fantasy-digital-alert-438278.mp3",
  });

  registerSetting("rollSound", {
    name: "TENSION_POOL.Settings.RollSound.Name",
    hint: "TENSION_POOL.Settings.RollSound.Hint",
    scope: "world",
    config: true,
    type: String,
    filePicker: "audio",
    default: "modules/tension-pool-2/assets/sounds/soundreality-evil-bell-343686.mp3",
  });

  registerSetting("acceptedVersion", {
    scope: "world",
    config: false,
    type: String,
    default: "",
  });
});

async function showDisclaimerDialog(): Promise<boolean> {
  const i18n = game.i18n!;
  const result = await foundry.applications.api.DialogV2.confirm({
    window: { title: i18n.localize("TENSION_POOL.Disclaimer.Title") },
    content: `<p>${i18n.localize("TENSION_POOL.Disclaimer.Content")}</p>`,
    yes: { label: i18n.localize("TENSION_POOL.Disclaimer.Accept"), callback: () => true },
    no: { label: i18n.localize("TENSION_POOL.Disclaimer.Decline"), callback: () => false },
    rejectClose: false,
  });
  return result ?? false;
}

async function showDisablePrompt(): Promise<void> {
  const i18n = game.i18n!;
  const wantsDisable = await foundry.applications.api.DialogV2.confirm({
    window: { title: i18n.localize("TENSION_POOL.Disclaimer.DisablePrompt.Title") },
    content: `<p>${i18n.localize("TENSION_POOL.Disclaimer.DisablePrompt.Content")}</p>`,
    yes: { label: i18n.localize("TENSION_POOL.Disclaimer.DisablePrompt.Yes"), callback: () => true },
    no: { label: i18n.localize("TENSION_POOL.Disclaimer.DisablePrompt.No"), callback: () => false },
    rejectClose: false,
  });

  if (wantsDisable) {
    // Clear consent so disclaimer re-appears if module is re-enabled
    await setSetting("acceptedVersion", "");
    new foundry.applications.sidebar.apps.ModuleManagement().render({ force: true });
  }
}

// @ts-expect-error — diceSoNiceReady is registered by Dice So Nice at runtime
Hooks.once("diceSoNiceReady", (dice3d: any) => {
  registerDiceSoNice(dice3d);
});

// Resolve tension icons in chat messages based on each client's icon theme.
Hooks.on("renderChatMessageHTML", (_message: ChatMessage, html: HTMLElement) => {
  const icons = html.querySelectorAll("[data-tp-icon]");
  if (!icons.length) return;

  const theme = getSetting("iconTheme");
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
  const setting = getSetting("complicationMacro");
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

Hooks.on("ready", async () => {
  const accepted = getSetting("acceptedVersion");
  const currentVersion = getModuleVersion();

  if (accepted !== currentVersion) {
    if ((game as Game).user!.isGM) {
      const consent = await showDisclaimerDialog();
      if (consent) {
        await setSetting("acceptedVersion", currentVersion);
      } else {
        await showDisablePrompt();
        return;
      }
    } else {
      // Non-GM: module not yet accepted by GM, stay inert
      return;
    }
  }

  poolApp = new TensionPoolApp();
  poolApp.render({ force: true });

  const api = createTensionPoolAPI();
  // @ts-expect-error — Foundry module API convention not in type definitions
  (game as Game).modules!.get(MODULE_ID)!.api = api;
  Hooks.callAll("tensionPool2Ready", api);

  (game as Game).socket!.on(`module.${MODULE_ID}`, (payload: any) => {
    if (payload.action === "announcement") {
      showBanner(payload.data);
    }
  });

  // Clear consent when the module is disabled via Module Management
  Hooks.on("updateSetting", (setting: any) => {
    if (setting.key !== "core.moduleConfiguration") return;
    const config = setting.value as Record<string, boolean> | undefined;
    if (config && config[MODULE_ID] === false) {
      setSetting("acceptedVersion", "");
    }
  });
});
