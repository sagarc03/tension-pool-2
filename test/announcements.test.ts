// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Foundry globals
const mockSettings = new Map<string, any>([
  ["soundEnabled", true],
  ["addDieSound", "sounds/lock.wav"],
  ["removeDieSound", "sounds/notify.wav"],
  ["rollSound", "sounds/drums.wav"],
]);
const mockEmit = vi.fn();
const mockChatCreate = vi.fn();
const mockAudioPlay = vi.fn();

Object.assign(globalThis, {
  foundry: {
    audio: {
      AudioHelper: { play: mockAudioPlay },
    },
  },
  game: {
    settings: {
      get: (_module: string, key: string) => mockSettings.get(key),
      set: vi.fn(),
      register: vi.fn(),
    },
    i18n: {
      localize: (key: string) => key,
      format: (key: string, data: any) => `${key} ${JSON.stringify(data)}`,
    },
    socket: { emit: mockEmit },
  } as any,
  ChatMessage: { create: mockChatCreate },
});

const { showBanner, playSound, postAnnouncementChat, broadcastAnnouncement } =
  await import("../src/scripts/announcements.js");

describe("showBanner", () => {
  afterEach(() => {
    document.querySelectorAll(".tp-announcement").forEach((el) => el.remove());
  });

  it("creates a banner element for 'rise' type", () => {
    // Create #interface element for the banner to attach to
    const iface = document.createElement("div");
    iface.id = "interface";
    document.body.appendChild(iface);

    showBanner({ type: "rise", current: 3, max: 6 });
    const banner = document.querySelector(".tp-announcement");
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toContain("3/6");

    iface.remove();
  });

  it("creates a dramatic banner for 'break' type", () => {
    const iface = document.createElement("div");
    iface.id = "interface";
    document.body.appendChild(iface);

    showBanner({ type: "break", current: 6, max: 6 });
    const banner = document.querySelector(".tp-announcement-dramatic");
    expect(banner).not.toBeNull();

    iface.remove();
  });

  it("does nothing for 'fade' type", () => {
    showBanner({ type: "fade", current: 0, max: 6 });
    const banner = document.querySelector(".tp-announcement");
    expect(banner).toBeNull();
  });
});

describe("playSound", () => {
  beforeEach(() => vi.clearAllMocks());

  it("plays addDieSound for 'rise'", () => {
    playSound("rise");
    expect(mockAudioPlay).toHaveBeenCalledWith(
      { src: "sounds/lock.wav", volume: 0.8, loop: false },
      true
    );
  });

  it("plays removeDieSound for 'ease'", () => {
    playSound("ease");
    expect(mockAudioPlay).toHaveBeenCalledWith(
      { src: "sounds/notify.wav", volume: 0.8, loop: false },
      true
    );
  });

  it("plays rollSound for 'break'", () => {
    playSound("break");
    expect(mockAudioPlay).toHaveBeenCalledWith(
      { src: "sounds/drums.wav", volume: 0.8, loop: false },
      true
    );
  });

  it("does not play for 'fade'", () => {
    playSound("fade");
    expect(mockAudioPlay).not.toHaveBeenCalled();
  });
});

describe("postAnnouncementChat", () => {
  beforeEach(() => mockChatCreate.mockClear());

  it("posts a chat message for 'rise'", async () => {
    await postAnnouncementChat({ type: "rise", current: 2, max: 6 });
    expect(mockChatCreate).toHaveBeenCalledOnce();
  });

  it("posts a chat message for 'fade'", async () => {
    await postAnnouncementChat({ type: "fade", current: 0, max: 6 });
    expect(mockChatCreate).toHaveBeenCalledOnce();
  });
});

describe("broadcastAnnouncement", () => {
  beforeEach(() => mockEmit.mockClear());

  it("emits socket event with announcement data", () => {
    broadcastAnnouncement({ type: "rise", current: 3, max: 6 });
    expect(mockEmit).toHaveBeenCalledWith("module.tension-pool-2", {
      action: "announcement",
      data: { type: "rise", current: 3, max: 6 },
    });
  });
});
