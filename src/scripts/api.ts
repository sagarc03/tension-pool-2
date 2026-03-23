import { getSetting, setSetting } from "./constants.js";
import { rollTensionPool } from "./tension-die.js";
import { announce } from "./announcements.js";
import { computeAddSteps } from "./add-steps.js";
import type { TensionRollResult } from "./tension-die.js";

export interface TensionPoolAPI {
  add(count?: number): Promise<void>;
  remove(count?: number): Promise<void>;
  roll(): Promise<TensionRollResult>;
  clear(): Promise<void>;
  customRoll(count: number): Promise<TensionRollResult>;
  getDiceCount(): number;
  getPoolSize(): number;
}

export function createTensionPoolAPI(): TensionPoolAPI {
  async function rollAndClear(diceCount: number): Promise<TensionRollResult> {
    const result = await rollTensionPool(diceCount);
    await setSetting("diceCount", 0);
    return result;
  }

  return {
    async add(count: number = 1): Promise<void> {
      if (count <= 0) return;
      const clamped = Math.min(count, 50);
      const current = getSetting("diceCount");
      const max = getSetting("poolSize");
      const steps = computeAddSteps(clamped, current, max);

      for (const step of steps) {
        if (step.type === "overflow") {
          if (step.added > 0) await setSetting("diceCount", step.newCount);
          await announce("break", step.newCount, max);
          await rollAndClear(max);
        } else {
          await setSetting("diceCount", step.newCount);
          await announce("rise", step.newCount, max);
        }
      }
    },

    async remove(count: number = 1): Promise<void> {
      if (count <= 0) return;
      const current = getSetting("diceCount");
      if (current <= 0) return;
      const max = getSetting("poolSize");
      const newCount = Math.max(current - count, 0);
      await setSetting("diceCount", newCount);
      await announce("ease", newCount, max);
    },

    async roll(): Promise<TensionRollResult> {
      const current = getSetting("diceCount");
      const max = getSetting("poolSize");
      await announce("break", current, max);
      return rollAndClear(Math.max(current, 1));
    },

    async clear(): Promise<void> {
      const max = getSetting("poolSize");
      await announce("fade", 0, max);
      await setSetting("diceCount", 0);
    },

    async customRoll(count: number): Promise<TensionRollResult> {
      const max = getSetting("poolSize");
      const clamped = Math.min(Math.max(count, 1), 50);
      await announce("break", 0, max);
      return rollTensionPool(clamped);
    },

    getDiceCount(): number {
      return getSetting("diceCount");
    },

    getPoolSize(): number {
      return getSetting("poolSize");
    },
  };
}
