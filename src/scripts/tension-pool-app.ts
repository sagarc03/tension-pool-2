import { rollTensionPool } from "./tension-die.js";

const { ApplicationV2, HandlebarsApplicationMixin } =
  foundry.applications.api;

const MODULE_ID = "tension-pool-2";

export const ICON_THEMES: Record<string, { tension: string; noTension: string }> = {
  skull: { tension: "fa-solid fa-skull", noTension: "fa-regular fa-skull" },
  square: { tension: "fa-solid fa-square-exclamation", noTension: "fa-regular fa-square" },
  thunder: { tension: "fa-solid fa-bolt", noTension: "fa-solid fa-sun" },
};

interface TensionPoolIcon {
  class: string;
}

interface TensionPoolContext extends foundry.applications.api.ApplicationV2.RenderContext {
  isGM: boolean;
  icons: TensionPoolIcon[];
  positionRight: boolean;
  tensionTooltip: string;
}

export class TensionPoolApp extends HandlebarsApplicationMixin(ApplicationV2)<TensionPoolContext> {
  static override DEFAULT_OPTIONS = {
    id: "tension-pool",
    classes: ["tension-pool", "faded-ui"],
    window: {
      frame: false,
      positioned: false,
    },
    actions: {
      addDie: TensionPoolApp._onAddDie,
      removeDie: TensionPoolApp._onRemoveDie,
      rollPool: TensionPoolApp._onRollPool,
      clearPool: TensionPoolApp._onClearPool,
    },
  };

  static override PARTS = {
    pool: {
      root: true,
      template: "modules/tension-pool-2/templates/pool.hbs",
    },
  };

  private _resizeObserver: ResizeObserver | null = null;
  private _mutationObserver: MutationObserver | null = null;

  override async _onRender(_context: any, _options: any) {
    const position = (game as Game).settings!.get(MODULE_ID as any, "position" as any) as string;
    this.element?.setAttribute("data-tooltip-direction", position === "right" ? "RIGHT" : "LEFT");
    this._positionNextToHotbar();

    this._resizeObserver?.disconnect();
    this._resizeObserver = new ResizeObserver(() => this._positionNextToHotbar());

    this._mutationObserver?.disconnect();
    this._mutationObserver = new MutationObserver(() => this._positionNextToHotbar());

    const uiMiddle = document.getElementById("ui-middle");
    if (uiMiddle) this._resizeObserver.observe(uiMiddle);

    const hotbar = document.getElementById("hotbar");
    if (hotbar) {
      this._resizeObserver.observe(hotbar);
      this._mutationObserver.observe(hotbar, { childList: true, subtree: true, attributes: true });
    }
  }

  override _onClose(_options: any) {
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._mutationObserver?.disconnect();
    this._mutationObserver = null;
  }

  _positionNextToHotbar() {
    if (!this.element) return;

    const hotbar = document.getElementById("hotbar");
    if (!hotbar) return;

    const el = this.element as HTMLElement;
    const position = (game as Game).settings!.get(
      MODULE_ID as any,
      "position" as any
    ) as string;

    const hotbarLeft = hotbar.offsetLeft;
    const hotbarWidth = hotbar.offsetWidth;
    const hotbarTop = hotbar.offsetTop;
    const hotbarHeight = hotbar.offsetHeight;

    const uiScale = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--ui-scale") || "1"
    );

    const uiMiddle = document.getElementById("ui-middle");
    const containerLeft = uiMiddle ? uiMiddle.offsetLeft : 0;
    const containerTop = uiMiddle ? uiMiddle.offsetTop : 0;

    const scaledLeft = containerLeft + hotbarLeft * uiScale;
    const scaledTop = containerTop + hotbarTop * uiScale;
    const scaledWidth = hotbarWidth * uiScale;
    const scaledHeight = hotbarHeight * uiScale;
    const elWidth = el.offsetWidth || 150;

    el.style.position = "fixed";
    el.style.top = `${scaledTop + (scaledHeight - el.offsetHeight) / 2}px`;

    if (position === "right") {
      el.style.left = `${scaledLeft + scaledWidth + 16}px`;
    } else {
      el.style.left = `${scaledLeft - elWidth - 16}px`;
    }
  }

  override async _prepareContext(
    _options: foundry.applications.api.ApplicationV2.RenderOptions
  ) {
    const settings = (game as Game).settings!;
    const diceCount = settings.get(MODULE_ID as any, "diceCount" as any) as number;
    const theme = settings.get(MODULE_ID as any, "iconTheme" as any) as string;
    const position = settings.get(MODULE_ID as any, "position" as any) as string;
    const iconSet = ICON_THEMES[theme] ?? ICON_THEMES.skull;

    const icons: TensionPoolIcon[] = [];
    if (diceCount === 0) {
      icons.push({ class: iconSet.noTension });
    } else {
      for (let i = 0; i < diceCount; i++) {
        icons.push({ class: iconSet.tension });
      }
    }

    const i18n = game.i18n!;
    const tensionTooltip = diceCount === 0
      ? i18n.localize("TENSION_POOL.NoTension")
      : i18n.format("TENSION_POOL.TensionCount", { count: String(diceCount) });

    return {
      isGM: (game as Game).user!.isGM,
      icons,
      positionRight: position === "right",
      tensionTooltip,
    };
  }

  static async _onAddDie(this: TensionPoolApp) {
    const settings = (game as Game).settings!;
    const current = settings.get(MODULE_ID as any, "diceCount" as any) as number;
    const max = settings.get(MODULE_ID as any, "poolSize" as any) as number;
    const newCount = current + 1;

    if (newCount > max) return;

    await settings.set(MODULE_ID as any, "diceCount" as any, newCount as any);

    // Auto-roll when pool is full
    if (newCount >= max) {
      await TensionPoolApp._rollAndClear(max);
    }
  }

  static async _onRemoveDie(this: TensionPoolApp) {
    const settings = (game as Game).settings!;
    const current = settings.get(MODULE_ID as any, "diceCount" as any) as number;
    if (current > 0) {
      await settings.set(MODULE_ID as any, "diceCount" as any, current - 1 as any);
    }
  }

  static async _onRollPool(this: TensionPoolApp) {
    const settings = (game as Game).settings!;
    const current = settings.get(MODULE_ID as any, "diceCount" as any) as number;
    await TensionPoolApp._rollAndClear(Math.max(current, 1));
  }

  static async _onClearPool(this: TensionPoolApp) {
    const settings = (game as Game).settings!;
    await settings.set(MODULE_ID as any, "diceCount" as any, 0 as any);
  }

  private static async _rollAndClear(diceCount: number) {
    await rollTensionPool(diceCount);
    await (game as Game).settings!.set(MODULE_ID as any, "diceCount" as any, 0 as any);
  }
}
