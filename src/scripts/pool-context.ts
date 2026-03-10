export const ICON_THEMES: Record<string, { tension: string; noTension: string }> = {
  skull: { tension: "fa-solid fa-skull", noTension: "fa-regular fa-skull" },
  square: { tension: "fa-solid fa-square-exclamation", noTension: "fa-regular fa-square" },
  thunder: { tension: "fa-solid fa-bolt", noTension: "fa-solid fa-sun" },
};

export interface TensionPoolIcon {
  class: string;
}

export interface TensionPoolContext {
  isGM: boolean;
  icons: TensionPoolIcon[];
  diceCount: number;
  compactDisplayIcon: string;
  tensionTooltip: string;
  collapsed: boolean;
  toggleIcon: string;
  toggleTooltip: string;
}

export function buildPoolContext(
  diceCount: number,
  theme: string,
  collapsed: boolean,
  isGM: boolean,
  i18n: { localize: (key: string) => string; format: (key: string, data: any) => string },
): TensionPoolContext {
  const iconSet = ICON_THEMES[theme] ?? ICON_THEMES.skull;

  const icons: TensionPoolIcon[] = [];
  if (diceCount === 0) {
    icons.push({ class: iconSet.noTension });
  } else {
    for (let i = 0; i < diceCount; i++) {
      icons.push({ class: iconSet.tension });
    }
  }

  const tensionTooltip = diceCount === 0
    ? i18n.localize("TENSION_POOL.NoTension")
    : i18n.format("TENSION_POOL.TensionCount", { count: String(diceCount) });

  return {
    isGM,
    icons,
    diceCount,
    compactDisplayIcon: diceCount === 0 ? iconSet.noTension : iconSet.tension,
    tensionTooltip,
    collapsed,
    toggleIcon: collapsed ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down",
    // Raw i18n key — Foundry's data-tooltip attribute auto-localizes it
    toggleTooltip: collapsed ? "TENSION_POOL.Expand" : "TENSION_POOL.Compact",
  };
}
