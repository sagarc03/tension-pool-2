import { rollTensionPool } from "./tension-die.js";
import { getSetting, setSetting } from "./constants.js";
import { announce } from "./announcements.js";
import { buildPoolContext, ICON_THEMES } from "./pool-context.js";
import type { TensionPoolContext } from "./pool-context.js";

export { ICON_THEMES, buildPoolContext };
export type { TensionPoolContext };

const { ApplicationV2, HandlebarsApplicationMixin } =
  foundry.applications.api;

export class TensionPoolApp extends HandlebarsApplicationMixin(ApplicationV2)<TensionPoolContext> {
  static override DEFAULT_OPTIONS = {
    id: "tension-pool",
    classes: ["tension-pool", "faded-ui"],
    window: {
      frame: false,
      positioned: false,
    },
    nonDismissible: true,
    actions: {
      addDie: TensionPoolApp._onAddDie,
      removeDie: TensionPoolApp._onRemoveDie,
      rollPool: TensionPoolApp._onRollPool,
      clearPool: TensionPoolApp._onClearPool,
      customRoll: TensionPoolApp._onCustomRoll,
      togglePool: TensionPoolApp._onTogglePool,
    },
  };

  static override PARTS = {
    pool: {
      template: "modules/tension-pool-2/templates/pool.hbs",
    },
  };

  private _resizeObserver: ResizeObserver | null = null;
  private _mutationObserver: MutationObserver | null = null;
  private _previousDiceCount: number = -1;

  override async _onRender(_context: any, _options: any) {
    const position = getSetting("position");
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

    // Animate icons on dice count change
    const currentCount = getSetting("diceCount");
    if (this._previousDiceCount >= 0 && this._previousDiceCount !== currentCount) {
      const icons = this.element?.querySelectorAll(".tp-icons i");
      if (icons) {
        const animClass = currentCount > this._previousDiceCount ? "tp-pulse" : "tp-fade";
        icons.forEach((icon) => {
          icon.classList.add(animClass);
          icon.addEventListener("animationend", () => icon.classList.remove(animClass), { once: true });
        });
      }
    }
    this._previousDiceCount = currentCount;
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
    const position = getSetting("position");

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
    return buildPoolContext(
      getSetting("diceCount"),
      getSetting("iconTheme"),
      getSetting("position"),
      getSetting("collapsed"),
      (game as Game).user!.isGM,
      game.i18n!,
    );
  }

  static async _onAddDie(this: TensionPoolApp) {
    const current = getSetting("diceCount");
    const max = getSetting("poolSize");
    const newCount = current + 1;

    if (newCount > max) return;

    await setSetting("diceCount", newCount);

    // Auto-roll when pool is full
    if (newCount >= max) {
      await announce("break", newCount, max);
      await TensionPoolApp._rollAndClear(max);
    } else {
      await announce("rise", newCount, max);
    }
  }

  static async _onRemoveDie(this: TensionPoolApp) {
    const current = getSetting("diceCount");
    if (current > 0) {
      const max = getSetting("poolSize");
      await setSetting("diceCount", current - 1);
      await announce("ease", current - 1, max);
    }
  }

  static async _onRollPool(this: TensionPoolApp) {
    const current = getSetting("diceCount");
    const max = getSetting("poolSize");
    await announce("break", current, max);
    await TensionPoolApp._rollAndClear(Math.max(current, 1));
  }

  static async _onClearPool(this: TensionPoolApp) {
    const max = getSetting("poolSize");
    await announce("fade", 0, max);
    await setSetting("diceCount", 0);
  }

  static async _onTogglePool(this: TensionPoolApp) {
    const current = getSetting("collapsed");
    await setSetting("collapsed", !current);
  }

  static async _onCustomRoll(this: TensionPoolApp) {
    const max = getSetting("poolSize");
    const input = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n!.localize("TENSION_POOL.CustomRoll.Title") },
      content: `<form><div class="form-group"><label>${game.i18n!.localize("TENSION_POOL.CustomRoll.Label")}</label><input type="number" name="count" value="${max}" min="1" max="50" autofocus></div></form>`,
      ok: {
        label: game.i18n!.localize("TENSION_POOL.Roll"),
        callback: (_event: any, button: any) => {
          return parseInt(button.form.elements.count.value, 10);
        },
      },
    });
    if (input && input > 0) {
      await announce("break", 0, max);
      await rollTensionPool(Math.min(input, 50));
    }
  }

  private static async _rollAndClear(diceCount: number) {
    await rollTensionPool(diceCount);
    await setSetting("diceCount", 0);
  }
}
