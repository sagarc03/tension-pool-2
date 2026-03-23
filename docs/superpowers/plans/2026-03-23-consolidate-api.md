# Consolidate API: Merge add/remove Methods

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `addDie`/`bulkAdd` into `add(count?)` and `removeDie`/`bulkRemove` into `remove(count?)`. Rename `bulk-add.ts` → `add-steps.ts`, `computeBulkAddSteps` → `computeAddSteps`, `BulkAddStep` → `AddStep`.

**Architecture:** The `add(count?)` method defaults to 1 and uses `computeAddSteps` for overflow handling. When the pool is already full, it auto-rolls then adds. The `remove(count?)` method defaults to 1, floors at 0, and no-ops on an empty pool. All consumers are updated.

**Tech Stack:** TypeScript, Vitest, pnpm

---

### Task 1: Rename bulk-add module

**Files:**
- Rename: `src/scripts/bulk-add.ts` → `src/scripts/add-steps.ts`
- Rename: `test/bulk-add.test.ts` → `test/add-steps.test.ts`
- Modify: `src/scripts/api.ts` (update import path and function name)

- [ ] **Step 1: Rename files**

```bash
git mv src/scripts/bulk-add.ts src/scripts/add-steps.ts
git mv test/bulk-add.test.ts test/add-steps.test.ts
```

- [ ] **Step 2: Rename exports in `src/scripts/add-steps.ts`**

In `src/scripts/add-steps.ts`:
- `BulkAddStep` → `AddStep`
- `computeBulkAddSteps` → `computeAddSteps`

- [ ] **Step 3: Update import in `src/scripts/api.ts`**

```typescript
// old
import { computeBulkAddSteps } from "./bulk-add.js";
// new
import { computeAddSteps } from "./add-steps.js";
```

Update the call site: `computeBulkAddSteps(` → `computeAddSteps(`

- [ ] **Step 4: Update `test/add-steps.test.ts`**

Update the import and all references:
- Import: `from "../src/scripts/add-steps.js"`
- `describe("computeAddSteps", ...)`
- All `computeBulkAddSteps(` → `computeAddSteps(`

- [ ] **Step 5: Build and test**

Run: `pnpm build && pnpm test`
Expected: Both succeed

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename bulk-add to add-steps, computeBulkAddSteps to computeAddSteps"
```

---

### Task 2: Update API interface and implementation

**Files:**
- Modify: `src/scripts/api.ts`

- [ ] **Step 1: Replace the 4 methods with 2 in the interface**

```typescript
export interface TensionPoolAPI {
  add(count?: number): Promise<void>;
  remove(count?: number): Promise<void>;
  roll(): Promise<TensionRollResult>;
  clear(): Promise<void>;
  customRoll(count: number): Promise<TensionRollResult>;
  getDiceCount(): number;
  getPoolSize(): number;
}
```

- [ ] **Step 2: Replace the 4 method implementations with 2**

Remove `addDie`, `removeDie`, `bulkAdd`, `bulkRemove`. Replace with:

```typescript
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
```

Note: No `if (current >= max) return;` guard on `add` — when the pool is full, `computeAddSteps` produces an overflow step that auto-rolls then continues adding.

- [ ] **Step 3: Build**

Run: `pnpm build`

---

### Task 3: Update tests

**Files:**
- Modify: `test/api.test.ts`

- [ ] **Step 1: Replace test describes**

Merge `addDie` and `bulkAdd` describes into a single `add` describe. Merge `removeDie` and `bulkRemove` into a single `remove` describe.

`add` tests:
- `it("adds 1 die by default")` — calls `api.add()`, expects diceCount set to 1
- `it("auto-rolls when pool reaches max")` — diceCount=5, calls `api.add()`, expects diceCount set to 6, then 0
- `it("auto-rolls and adds when pool is already full")` — diceCount=6, calls `api.add()`, expects overflow roll (diceCount set to 0), then diceCount set to 1
- `it("adds multiple dice")` — calls `api.add(3)`, expects diceCount set to 3
- `it("handles overflow by rolling and continuing")` — calls `api.add(8)`, expects overflow sequence
- `it("clamps count to 50")` — calls `api.add(999)`, expects diceCount set to 50
- `it("does nothing for count <= 0")` — calls `api.add(0)`, expects no set call

`remove` tests:
- `it("removes 1 die by default")` — diceCount=3, calls `api.remove()`, expects diceCount set to 2
- `it("does nothing when pool is empty")` — diceCount=0, calls `api.remove()`, expects no set call
- `it("removes multiple dice")` — diceCount=5, calls `api.remove(3)`, expects diceCount set to 2
- `it("floors at 0")` — diceCount=2, calls `api.remove(10)`, expects diceCount set to 0
- `it("does nothing for count <= 0")` — diceCount=5, calls `api.remove(0)`, expects no set call

- [ ] **Step 2: Run tests**

Run: `pnpm test`
Expected: All pass

---

### Task 4: Update TensionPoolApp consumers

**Files:**
- Modify: `src/scripts/tension-pool-app.ts`

- [ ] **Step 1: Update action methods**

```typescript
  static async _onAddDie(this: TensionPoolApp) {
    await TensionPoolApp._getAPI().add();
  }

  static async _onRemoveDie(this: TensionPoolApp) {
    await TensionPoolApp._getAPI().remove();
  }
```

In `_onBulkAdd`, change `bulkAdd(input)` to `add(input)`.

- [ ] **Step 2: Build and test**

Run: `pnpm build && pnpm test`
Expected: Both succeed

---

### Task 5: Update dev macros

**Files:**
- Modify: `src/scripts/dev-macros.ts`

- [ ] **Step 1: Update macro commands**

| Old | New |
|---|---|
| `TP: Add Die` → `api?.addDie()` | `TP: Add Die` → `api?.add()` |
| `TP: Remove Die` → `api?.removeDie()` | `TP: Remove Die` → `api?.remove()` |
| `TP: Bulk Add (3)` → `api?.bulkAdd(3)` | `TP: Add (3)` → `api?.add(3)` |
| `TP: Bulk Remove (2)` → `api?.bulkRemove(2)` | `TP: Remove (2)` → `api?.remove(2)` |

- [ ] **Step 2: Build**

Run: `pnpm build`

---

### Task 6: Update README and commit

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the Macro API table**

```markdown
| Method | Description |
|---|---|
| `api.add(count?)` | Add dice to the pool (default 1, handles overflow/auto-roll) |
| `api.remove(count?)` | Remove dice from the pool (default 1, floors at 0) |
| `api.roll()` | Roll the current pool and clear it (rolls 1 die if empty) |
| `api.clear()` | Clear the pool without rolling |
| `api.customRoll(count)` | Roll any number of tension dice without affecting the pool |
| `api.getDiceCount()` | Get the current number of dice in the pool |
| `api.getPoolSize()` | Get the configured maximum pool size |
```

Update the example macros to use `api.add()` instead of `api.addDie()`.

- [ ] **Step 2: Commit all changes**

```bash
git add src/scripts/api.ts test/api.test.ts src/scripts/tension-pool-app.ts src/scripts/dev-macros.ts README.md
git commit -m "refactor: consolidate add/remove API methods

Merge addDie/bulkAdd into add(count?) and removeDie/bulkRemove into
remove(count?). Default count is 1. Pool auto-rolls on overflow
including when already full. Simplifies the API from 9 to 7 methods."
```
