import { MODULE_ID, getSetting, safeGetSetting, getGMWhisperIDs } from "./constants.js";

const FACE_COUNTS: Record<string, number> = {
  d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20,
};

const THEME_SYMBOLS: Record<string, string> = {
  skull: "\u2620",   // ☠
  square: "\u2757",  // ❗
  thunder: "\u26A1", // ⚡
};

/**
 * Custom TensionDie — configurable faces, total counts how many 1s were rolled.
 */
export class TensionDie extends foundry.dice.terms.Die {
  constructor(termData: any = {}) {
    const diceSize = TensionDie._getDiceSize();
    termData.faces = FACE_COUNTS[diceSize] ?? 6;
    super(termData);
  }

  static override DENOMINATION = "t";

  override get total(): number {
    return this.results.filter((r: any) => !r.discarded && r.result === 1).length;
  }

  private static _getDiceSize(): string {
    return safeGetSetting("diceSize", "d6");
  }
}

/**
 * Register the TensionDie with Foundry's dice system.
 */
export function registerTensionDie() {
  (CONFIG as any).Dice.terms["t"] = TensionDie;
}

/**
 * Register custom dice appearance with Dice So Nice.
 */
export function registerDiceSoNice(dice3d: any) {
  dice3d.addSystem(
    { id: MODULE_ID, name: "Tension Pool 2" },
    "default"
  );

  dice3d.addColorset({
    name: "tension-pool-2",
    description: "Tension Pool",
    category: "Tension Pool 2",
    foreground: "#ffff00",
    background: "#1a1a1a",
    outline: "#000000",
    edge: "#1a1a1a",
    texture: "none",
    material: "plastic",
    visibility: "visible",
  }, "default");

  // Register preset for current die shape
  updateDiceSoNicePreset(dice3d);
}

/**
 * Update the Dice So Nice preset to match the current dice size setting.
 */
function updateDiceSoNicePreset(dice3d: any) {
  const diceSize = safeGetSetting("diceSize", "d6");
  const faces = FACE_COUNTS[diceSize] ?? 6;
  const iconTheme = safeGetSetting("iconTheme", "skull");
  const symbol = THEME_SYMBOLS[iconTheme] ?? THEME_SYMBOLS.skull;
  const labels = [symbol, ...Array(faces - 1).fill("")];
  dice3d.addDicePreset({
    type: "dt",
    labels,
    system: MODULE_ID,
    fontScale: 1.5,
    colorset: "tension-pool-2",
  }, diceSize);
}

export interface TensionRollResult {
  diceCount: number;
  results: number[];
  hasComplication: boolean;
  complicationCount: number;
}

/**
 * Roll the tension pool, show 3D dice, post result to chat.
 */
export async function rollTensionPool(diceCount: number): Promise<TensionRollResult> {
  if (diceCount <= 0) {
    return { diceCount: 0, results: [], hasComplication: false, complicationCount: 0 };
  }

  // Always use custom dt — TensionDie reads face count from diceSize setting
  const hasDSN = (game as Game).modules!.get("dice-so-nice")?.active && (game as any).dice3d;

  let results: number[];

  if (hasDSN) {
    // Use custom TensionDie for DSN visual
    const roll = new Roll(`${diceCount}dt`) as any;
    await roll.evaluate();
    results = roll.terms[0].results.map((r: any) => r.result).sort();
    await (game as any).dice3d.showForRoll(roll, game.user, true);
  } else {
    // Use standard dice when DSN is not present
    const diceSize = getSetting("diceSize") || "d6";
    const roll = new Roll(`${diceCount}${diceSize}`) as any;
    await roll.evaluate();
    results = roll.terms[0].results.map((r: any) => r.result).sort();
  }

  const complicationCount = results.filter((r: number) => r === 1).length;
  const hasComplication = complicationCount > 0;

  // Build custom chat message with icons
  const i18n = game.i18n!;
  const icons = hasComplication
    ? results
        .filter((r) => r === 1)
        .map(() => '<i class="tp-die tp-die-hit" data-tp-icon="tension"></i>')
        .join("")
    : '<i class="tp-die tp-die-miss" data-tp-icon="noTension"></i>';

  const outcome = hasComplication
    ? `<strong class="tp-result-hit">${i18n.localize("TENSION_POOL.Complication")}</strong>`
    : `<strong class="tp-result-safe">${i18n.localize("TENSION_POOL.Safe")}</strong>`;

  const gmOnly = getSetting("rollVisibility") === "gmOnly";
  const whisper = gmOnly ? getGMWhisperIDs() : [];

  await ChatMessage.create({
    content: `
      <div class="tension-pool-roll">
        <div class="tp-dice-results">${icons}</div>
        <div>${outcome}</div>
      </div>
    `.trim(),
    speaker: { alias: i18n.localize("TENSION_POOL.Title") },
    whisper,
  } as any);

  // Send a public ominous message so players know a roll happened
  if (gmOnly) {
    await ChatMessage.create({
      content: `
        <div class="tension-pool-roll">
          <div class="tp-dice-results"><i class="tp-die tp-die-hidden fa-solid fa-eye-slash"></i><i class="tp-die tp-die-hidden fa-solid fa-eye-slash"></i><i class="tp-die tp-die-hidden fa-solid fa-eye-slash"></i></div>
          <div><strong class="tp-result-hidden">${i18n.localize("TENSION_POOL.RollHidden")}</strong></div>
        </div>
      `.trim(),
      speaker: { alias: i18n.localize("TENSION_POOL.Title") },
    } as any);
  }

  const rollResult = { diceCount, results, hasComplication, complicationCount };

  // @ts-expect-error — custom hooks not in Foundry's HookConfig
  Hooks.callAll("tensionPoolRolled", rollResult);
  if (hasComplication) {
    // @ts-expect-error — custom hooks not in Foundry's HookConfig
    Hooks.callAll("tensionPoolComplication", rollResult);
  }

  return rollResult;
}
