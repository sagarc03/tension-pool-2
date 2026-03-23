// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTensionPoolAPI } from "../src/scripts/api.js";

const mockSettings = new Map<string, any>();
const mockCallAll = vi.fn(() => true);
const mockChatCreate = vi.fn();

let mockRollResults: number[] = [];

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

vi.hoisted(() => {
  Object.assign(globalThis, {
    foundry: {
      dice: { terms: { Die: class { faces: number; results: any[]; constructor(td: any = {}) { this.faces = td.faces ?? 6; this.results = []; } static DENOMINATION = ""; get total() { return this.results.reduce((s: number, r: any) => s + r.result, 0); } } } },
      audio: { AudioHelper: { play: () => { } } },
    },
    game: {
      settings: { get: () => undefined, set: () => Promise.resolve(), register: () => { } },
      modules: { get: () => undefined },
      user: { id: "user1", isGM: true },
      users: { filter: (fn: any) => [{ id: "user1", isGM: true }].filter(fn) },
      i18n: { localize: (key: string) => key, format: (key: string, data: any) => `${key} ${JSON.stringify(data)}` },
      socket: { emit: () => { } },
    },
    Roll: class { formula: string; terms: any[]; constructor(f: string) { this.formula = f; this.terms = [{ results: [] }]; } async evaluate() { return this; } },
    ChatMessage: { create: () => { } },
    Hooks: { callAll: () => true },
    CONFIG: { Dice: { terms: {} } },
    ui: { notifications: { warn: () => { }, error: () => { } } },
  });
});

// Now override with trackable mocks (vi.hoisted stubs just satisfy import-time access)
Object.assign(globalThis, {
  foundry: {
    dice: { terms: { Die: MockDie } },
    audio: { AudioHelper: { play: vi.fn() } },
  },
  game: {
    settings: {
      get: (_module: string, key: string) => mockSettings.get(key),
      set: vi.fn((_module: string, key: string, value: any) => {
        mockSettings.set(key, value);
        return Promise.resolve(value);
      }),
      register: vi.fn(),
    },
    modules: { get: () => undefined },
    user: { id: "user1", isGM: true },
    users: {
      filter: (fn: any) => [{ id: "user1", isGM: true }].filter(fn),
    },
    i18n: {
      localize: (key: string) => key,
      format: (key: string, data: any) => `${key} ${JSON.stringify(data)}`,
    },
    socket: { emit: vi.fn() },
  } as any,
  Roll: MockRoll,
  ChatMessage: { create: mockChatCreate },
  Hooks: { callAll: mockCallAll },
  CONFIG: { Dice: { terms: {} } },
  ui: { notifications: { warn: vi.fn(), error: vi.fn() } },
});


describe("Tension Pool API", () => {
  let api: ReturnType<typeof createTensionPoolAPI>;

  beforeEach(() => {
    mockSettings.clear();
    mockSettings.set("diceCount", 0);
    mockSettings.set("poolSize", 6);
    mockSettings.set("diceSize", "d6");
    mockSettings.set("soundEnabled", false);
    mockSettings.set("rollVisibility", "public");
    mockRollResults = [];
    mockCallAll.mockClear();
    mockChatCreate.mockClear();
    (game as any).settings.set.mockClear();
    api = createTensionPoolAPI();
  });

  describe("add", () => {
    it("adds 1 die by default", async () => {
      await api.add();
      expect((game as any).settings.set).toHaveBeenCalledWith(
        "tension-pool-2", "diceCount", 1
      );
    });

    it("auto-rolls when pool reaches max", async () => {
      mockSettings.set("diceCount", 5);
      mockRollResults = [2, 3, 4, 5, 6, 1];
      await api.add();
      expect((game as any).settings.set).toHaveBeenCalledWith(
        "tension-pool-2", "diceCount", 6
      );
      expect((game as any).settings.set).toHaveBeenCalledWith(
        "tension-pool-2", "diceCount", 0
      );
    });

    it("auto-rolls and adds when pool is already full", async () => {
      mockSettings.set("diceCount", 6);
      mockRollResults = [2, 3, 4, 5, 6, 1];
      await api.add();
      expect((game as any).settings.set).toHaveBeenCalledWith("tension-pool-2", "diceCount", 0);
      expect((game as any).settings.set).toHaveBeenCalledWith("tension-pool-2", "diceCount", 1);
    });

    it("adds multiple dice", async () => {
      await api.add(3);
      expect((game as any).settings.set).toHaveBeenCalledWith(
        "tension-pool-2", "diceCount", 3
      );
    });

    it("handles overflow by rolling and continuing", async () => {
      mockSettings.set("poolSize", 6);
      mockRollResults = [2, 3, 4, 5, 6, 1];
      await api.add(8);
      expect((game as any).settings.set).toHaveBeenCalledWith("tension-pool-2", "diceCount", 6);
      expect((game as any).settings.set).toHaveBeenCalledWith("tension-pool-2", "diceCount", 0);
      expect((game as any).settings.set).toHaveBeenCalledWith("tension-pool-2", "diceCount", 2);
    });

    it("clamps count to 50", async () => {
      mockSettings.set("poolSize", 100);
      await api.add(999);
      expect((game as any).settings.set).toHaveBeenCalledWith(
        "tension-pool-2", "diceCount", 50
      );
    });

    it("does nothing for count <= 0", async () => {
      await api.add(0);
      expect((game as any).settings.set).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("removes 1 die by default", async () => {
      mockSettings.set("diceCount", 3);
      await api.remove();
      expect((game as any).settings.set).toHaveBeenCalledWith(
        "tension-pool-2", "diceCount", 2
      );
    });

    it("does nothing when pool is empty", async () => {
      mockSettings.set("diceCount", 0);
      await api.remove();
      expect((game as any).settings.set).not.toHaveBeenCalled();
    });

    it("removes multiple dice", async () => {
      mockSettings.set("diceCount", 5);
      await api.remove(3);
      expect((game as any).settings.set).toHaveBeenCalledWith(
        "tension-pool-2", "diceCount", 2
      );
    });

    it("floors at 0", async () => {
      mockSettings.set("diceCount", 2);
      await api.remove(10);
      expect((game as any).settings.set).toHaveBeenCalledWith(
        "tension-pool-2", "diceCount", 0
      );
    });

    it("does nothing for count <= 0", async () => {
      mockSettings.set("diceCount", 5);
      await api.remove(0);
      expect((game as any).settings.set).not.toHaveBeenCalled();
    });
  });

  describe("roll", () => {
    it("rolls current pool and clears", async () => {
      mockSettings.set("diceCount", 3);
      mockRollResults = [2, 3, 4];
      const result = await api.roll();
      expect(result.diceCount).toBe(3);
      expect((game as any).settings.set).toHaveBeenCalledWith(
        "tension-pool-2", "diceCount", 0
      );
    });

    it("rolls 1 die when pool is empty", async () => {
      mockSettings.set("diceCount", 0);
      mockRollResults = [4];
      const result = await api.roll();
      expect(result.diceCount).toBe(1);
      expect((game as any).settings.set).toHaveBeenCalledWith(
        "tension-pool-2", "diceCount", 0
      );
    });
  });

  describe("clear", () => {
    it("resets dice count to 0", async () => {
      mockSettings.set("diceCount", 4);
      await api.clear();
      expect((game as any).settings.set).toHaveBeenCalledWith(
        "tension-pool-2", "diceCount", 0
      );
    });
  });

  describe("customRoll", () => {
    it("rolls specified number of dice without affecting pool", async () => {
      mockSettings.set("diceCount", 3);
      mockRollResults = [1, 2, 4, 5, 6];
      const result = await api.customRoll(5);
      expect(result.diceCount).toBe(5);
      expect((game as any).settings.set).not.toHaveBeenCalledWith(
        "tension-pool-2", "diceCount", expect.anything()
      );
    });

    it("clamps count to 50", async () => {
      mockRollResults = Array(50).fill(2);
      const result = await api.customRoll(999);
      expect(result.diceCount).toBe(50);
    });

    it("floors count at 1", async () => {
      mockRollResults = [3];
      const result = await api.customRoll(0);
      expect(result.diceCount).toBe(1);
    });
  });

  describe("getDiceCount", () => {
    it("returns current dice count", () => {
      mockSettings.set("diceCount", 4);
      expect(api.getDiceCount()).toBe(4);
    });
  });

  describe("getPoolSize", () => {
    it("returns configured pool size", () => {
      mockSettings.set("poolSize", 10);
      expect(api.getPoolSize()).toBe(10);
    });
  });
});
