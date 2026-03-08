const { ApplicationV2, HandlebarsApplicationMixin } =
  foundry.applications.api;

interface TensionPoolContext extends foundry.applications.api.ApplicationV2.RenderContext {
  greeting: string;
}

export class TensionPoolApp extends HandlebarsApplicationMixin(ApplicationV2)<TensionPoolContext> {
  static override DEFAULT_OPTIONS = {
    id: "tension-pool",
    classes: ["tension-pool", "faded-ui"],
    window: {
      frame: false,
      positioned: false,
    },
  };

  static override PARTS = {
    pool: {
      root: true,
      template: "modules/tension-pool-2/templates/pool.hbs",
    },
  };

  override async _onRender(_context: any, _options: any) {
    this._positionNextToHotbar();
  }

  _positionNextToHotbar() {
    if (!this.element) return;

    const hotbar = document.getElementById("hotbar");
    if (!hotbar) return;

    const el = this.element as HTMLElement;
    const position = (game as Game).settings!.get(
      "tension-pool-2" as any,
      "position" as any
    ) as string;

    // Use offsetLeft/offsetWidth which aren't affected by transform scale
    // Walk up to find the hotbar's actual position in the scaled container
    const hotbarLeft = hotbar.offsetLeft;
    const hotbarWidth = hotbar.offsetWidth;
    const hotbarTop = hotbar.offsetTop;
    const hotbarHeight = hotbar.offsetHeight;

    // Get UI scale
    const uiScale = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--ui-scale") || "1"
    );

    // Get the #ui-middle offset (the scaled container)
    const uiMiddle = document.getElementById("ui-middle");
    const containerLeft = uiMiddle ? uiMiddle.offsetLeft : 0;
    const containerTop = uiMiddle ? uiMiddle.offsetTop : 0;

    // Calculate the scaled screen position
    const scaledLeft = containerLeft + hotbarLeft * uiScale;
    const scaledTop = containerTop + hotbarTop * uiScale;
    const scaledWidth = hotbarWidth * uiScale;
    const scaledHeight = hotbarHeight * uiScale;
    const elWidth = el.offsetWidth || 150;

    // Vertically center with the hotbar
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
    return {
      greeting: game.i18n!.localize("TENSION_POOL.Greeting"),
    };
  }
}
