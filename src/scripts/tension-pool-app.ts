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
    classes: ["tension-pool"],
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
      bulkAdd: TensionPoolApp._onBulkAdd,
      togglePool: TensionPoolApp._onTogglePool,
    },
  };

  static override PARTS = {
    pool: {
      template: "modules/tension-pool-2/templates/pool.hbs",
    },
  };

  private _previousDiceCount: number = -1;
  private _renderDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _dragState: { startX: number; startY: number; startLeft: number; startTop: number } | null = null;

  /**
   * Debounced render — batches rapid setting changes (e.g. fast add/remove)
   * into a single re-render after 100ms of quiet.
   */
  debouncedRender() {
    if (this._renderDebounceTimer) clearTimeout(this._renderDebounceTimer);
    this._renderDebounceTimer = setTimeout(() => {
      this._renderDebounceTimer = null;
      this.render({ force: true });
    }, 100);
  }

  override async _onRender(_context: any, _options: any) {
    const el = this.element as HTMLElement;
    if (!el) return;

    // Apply saved or default position
    const saved = getSetting("windowPosition");
    if (saved) {
      el.style.position = "fixed";
      el.style.left = `${saved.left}px`;
      el.style.top = `${saved.top}px`;
    } else if (this._previousDiceCount === -1) {
      // Center on screen for first-time users
      el.style.position = "fixed";
      const left = Math.round((window.innerWidth - (el.offsetWidth || 0)) / 2);
      const top = Math.round((window.innerHeight - (el.offsetHeight || 0)) / 2);
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    }

    // Set up drag handling — anything except buttons initiates drag
    const wrapper = el.querySelector(".tp-wrapper") as HTMLElement;
    if (wrapper) {
      wrapper.addEventListener("pointerdown", this._onDragStart.bind(this));
    }

    // Animate icons on dice count change
    const currentCount = getSetting("diceCount");
    if (this._previousDiceCount >= 0 && this._previousDiceCount !== currentCount) {
      const icons = el.querySelectorAll(".tp-icons i");
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

  private _onDragStart(event: PointerEvent) {
    if ((event.target as HTMLElement).closest("button")) return;
    const el = this.element as HTMLElement;
    if (!el) return;

    this._dragState = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: parseInt(el.style.left, 10) || 0,
      startTop: parseInt(el.style.top, 10) || 0,
    };

    const onMove = (e: PointerEvent) => {
      if (!this._dragState) return;
      const dx = e.clientX - this._dragState.startX;
      const dy = e.clientY - this._dragState.startY;
      el.style.left = `${this._dragState.startLeft + dx}px`;
      el.style.top = `${this._dragState.startTop + dy}px`;
    };

    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);

      if (this._dragState) {
        const left = parseInt(el.style.left, 10);
        const top = parseInt(el.style.top, 10);
        if (!isNaN(left) && !isNaN(top)) {
          setSetting("windowPosition", { left, top });
        }
        this._dragState = null;
      }
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  override async _prepareContext(
    _options: foundry.applications.api.ApplicationV2.RenderOptions
  ) {
    return buildPoolContext(
      getSetting("diceCount"),
      getSetting("iconTheme"),
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

  static async _onBulkAdd(this: TensionPoolApp) {
    const max = getSetting("poolSize");
    const input = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n!.localize("TENSION_POOL.BulkAdd.Title") },
      content: `<form><div class="form-group"><label>${game.i18n!.localize("TENSION_POOL.BulkAdd.Label")}</label><input type="number" name="count" value="1" min="1" max="50" autofocus></div></form>`,
      ok: {
        label: game.i18n!.localize("TENSION_POOL.AddDie"),
        callback: (_event: any, button: any) => {
          return parseInt(button.form.elements.count.value, 10);
        },
      },
    });
    if (!input || input <= 0) return;
    let remaining = Math.min(input, 50);

    while (remaining > 0) {
      const current = getSetting("diceCount");
      const space = max - current;
      const toAdd = Math.min(remaining, space);

      if (toAdd > 0) {
        const newCount = current + toAdd;
        await setSetting("diceCount", newCount);
        remaining -= toAdd;

        if (newCount >= max) {
          await announce("break", newCount, max);
          await TensionPoolApp._rollAndClear(max);
        } else {
          await announce("rise", newCount, max);
        }
      } else {
        // Pool is already full — roll and clear, then continue
        await announce("break", current, max);
        await TensionPoolApp._rollAndClear(max);
      }
    }
  }

  static async _onTogglePool(this: TensionPoolApp) {
    const current = getSetting("collapsed");
    const next = !current;
    // Toggle CSS class immediately for instant visual feedback,
    // then persist to settings (which triggers a full re-render in the background).
    this.element?.classList.toggle("tp-collapsed", next);
    await setSetting("collapsed", next);
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
