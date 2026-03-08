import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Foundry globals before importing
class MockDie {
  faces: number;
  results: any[];
  constructor(termData: any = {}) {
    this.faces = termData.faces ?? 6;
    this.results = [];
  }
  static DENOMINATION = "";
  get total(): number {
    return this.results.reduce((sum: number, r: any) => sum + r.result, 0);
  }
}

let mockRollResults: number[] = [];

class MockRoll {
  formula: string;
  terms: any[];
  constructor(formula: string) {
    this.formula = formula;
    this.terms = [{ results: [] }];
  }
  async evaluate() {
    this.terms[0].results = mockRollResults.map((r) => ({ result: r, active: true, discarded: false }));
    return this;
  }
}

const mockSettings = new Map<string, any>();
const mockCallAll = vi.fn(() => true);
const mockChatCreate = vi.fn();

Object.assign(globalThis, {
  foundry: { dice: { terms: { Die: MockDie } } },
  game: {
    settings: {
      get: (_module: string, key: string) => mockSettings.get(key) ?? (key === "diceSize" ? "d6" : undefined),
      set: vi.fn(),
      register: vi.fn(),
    },
    modules: { get: () => undefined },
    user: { id: "user1", isGM: true },
    i18n: {
      localize: (key: string) => key,
      format: (key: string, data: any) => `${key} ${JSON.stringify(data)}`,
    },
  } as any,
  Roll: MockRoll,
  ChatMessage: { create: mockChatCreate },
  Hooks: { callAll: mockCallAll },
  CONFIG: { Dice: { terms: {} } },
});

// Dynamic import after globals are set
const { TensionDie, registerTensionDie, rollTensionPool } = await import("../src/scripts/tension-die.js");

describe("TensionDie", () => {
  it("has denomination 't'", () => {
    expect(TensionDie.DENOMINATION).toBe("t");
  });

  it("defaults to 6 faces", () => {
    const die = new TensionDie();
    expect(die.faces).toBe(6);
  });

  it("counts 1s as total", () => {
    const die = new TensionDie();
    die.results = [
      { result: 1, discarded: false },
      { result: 3, discarded: false },
      { result: 1, discarded: false },
      { result: 5, discarded: false },
    ];
    expect(die.total).toBe(2);
  });

  it("ignores discarded results", () => {
    const die = new TensionDie();
    die.results = [
      { result: 1, discarded: true },
      { result: 1, discarded: false },
    ];
    expect(die.total).toBe(1);
  });

  it("returns 0 when no 1s rolled", () => {
    const die = new TensionDie();
    die.results = [
      { result: 2, discarded: false },
      { result: 4, discarded: false },
    ];
    expect(die.total).toBe(0);
  });
});

describe("registerTensionDie", () => {
  it("registers TensionDie in CONFIG.Dice.terms", () => {
    registerTensionDie();
    expect((CONFIG as any).Dice.terms["t"]).toBe(TensionDie);
  });
});

describe("rollTensionPool", () => {
  beforeEach(() => {
    mockRollResults = [];
    mockCallAll.mockClear();
    mockChatCreate.mockClear();
  });

  it("returns empty result for 0 dice", async () => {
    const result = await rollTensionPool(0);
    expect(result).toEqual({
      diceCount: 0,
      results: [],
      hasComplication: false,
      complicationCount: 0,
    });
    expect(mockChatCreate).not.toHaveBeenCalled();
  });

  it("returns empty result for negative dice", async () => {
    const result = await rollTensionPool(-1);
    expect(result).toEqual({
      diceCount: 0,
      results: [],
      hasComplication: false,
      complicationCount: 0,
    });
  });

  it("detects complications when 1s are rolled", async () => {
    mockRollResults = [1, 3, 5];
    const result = await rollTensionPool(3);
    expect(result.hasComplication).toBe(true);
    expect(result.complicationCount).toBe(1);
    expect(result.diceCount).toBe(3);
  });

  it("detects no complications when no 1s are rolled", async () => {
    mockRollResults = [2, 4, 6];
    const result = await rollTensionPool(3);
    expect(result.hasComplication).toBe(false);
    expect(result.complicationCount).toBe(0);
  });

  it("counts multiple complications", async () => {
    mockRollResults = [1, 1, 1, 4, 5];
    const result = await rollTensionPool(5);
    expect(result.hasComplication).toBe(true);
    expect(result.complicationCount).toBe(3);
  });

  it("sorts results", async () => {
    mockRollResults = [5, 1, 3];
    const result = await rollTensionPool(3);
    expect(result.results).toEqual([1, 3, 5]);
  });

  it("creates a chat message", async () => {
    mockRollResults = [2, 3];
    await rollTensionPool(2);
    expect(mockChatCreate).toHaveBeenCalledOnce();
  });

  it("fires tensionPoolRolled hook on every roll", async () => {
    mockRollResults = [2, 3];
    await rollTensionPool(2);
    expect(mockCallAll).toHaveBeenCalledWith("tensionPoolRolled", expect.objectContaining({
      diceCount: 2,
      hasComplication: false,
    }));
  });

  it("fires tensionPoolComplication hook only on complication", async () => {
    mockRollResults = [2, 3];
    await rollTensionPool(2);
    expect(mockCallAll).not.toHaveBeenCalledWith("tensionPoolComplication", expect.anything());

    mockCallAll.mockClear();
    mockRollResults = [1, 3];
    await rollTensionPool(2);
    expect(mockCallAll).toHaveBeenCalledWith("tensionPoolComplication", expect.objectContaining({
      hasComplication: true,
      complicationCount: 1,
    }));
  });
});
