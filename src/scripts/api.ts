import { getSetting, setSetting } from "./constants.js";
import { rollTensionPool } from "./tension-die.js";
import { announce } from "./announcements.js";
import { computeAddSteps } from "./add-steps.js";
import type { TensionRollResult } from "./tension-die.js";

export interface TensionPoolAPI {
  addDie(): Promise<void>;
  removeDie(): Promise<void>;
  roll(): Promise<TensionRollResult>;
  clear(): Promise<void>;
  bulkAdd(count: number): Promise<void>;
  bulkRemove(count: number): Promise<void>;
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
    async addDie(): Promise<void> {
      const current = getSetting("diceCount");
      const max = getSetting("poolSize");
      const newCount = current + 1;
      if (newCount > max) return;

      await setSetting("diceCount", newCount);

      if (newCount >= max) {
        await announce("break", newCount, max);
        await rollAndClear(max);
      } else {
        await announce("rise", newCount, max);
      }
    },

    async removeDie(): Promise<void> {
      const current = getSetting("diceCount");
      if (current <= 0) return;
      const max = getSetting("poolSize");
      await setSetting("diceCount", current - 1);
      await announce("ease", current - 1, max);
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

    async bulkAdd(count: number): Promise<void> {
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

    async bulkRemove(count: number): Promise<void> {
      if (count <= 0) return;
      const current = getSetting("diceCount");
      const max = getSetting("poolSize");
      const newCount = Math.max(current - count, 0);
      await setSetting("diceCount", newCount);
      await announce("ease", newCount, max);
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
