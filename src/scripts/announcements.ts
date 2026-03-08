import { MODULE_ID, getSetting } from "./constants.js";

export type AnnouncementType = "rise" | "ease" | "break" | "fade";

interface AnnouncementData {
  type: AnnouncementType;
  current: number;
  max: number;
}

/**
 * Show a banner/overlay announcement on screen.
 * "rise" and "ease" show a slide-in banner.
 * "break" shows a dramatic centered overlay.
 * "fade" is chat-only, no banner.
 */
export function showBanner(data: AnnouncementData): void {
  if (data.type === "fade") return;

  const i18n = game.i18n!;
  const isDramatic = data.type === "break";

  const container = document.createElement("div");
  container.classList.add("tp-announcement");
  if (isDramatic) container.classList.add("tp-announcement-dramatic");

  const text = (() => {
    switch (data.type) {
      case "rise":
        return `${i18n.localize("TENSION_POOL.Announce.TensionRises")} (${data.current}/${data.max})`;
      case "ease":
        return `${i18n.localize("TENSION_POOL.Announce.TensionEases")} (${data.current}/${data.max})`;
      case "break":
        return i18n.localize("TENSION_POOL.Announce.TensionBreaks");
    }
  })();

  container.innerHTML = `<span class="tp-announcement-text">${text}</span>`;
  document.getElementById("interface")?.appendChild(container);

  const duration = isDramatic ? 3000 : 2000;
  setTimeout(() => container.remove(), duration);
}

/**
 * Play a sound effect and broadcast to all clients.
 */
export function playSound(type: AnnouncementType): void {
  const src = (() => {
    switch (type) {
      case "rise": return getSetting("addDieSound");
      case "ease": return getSetting("removeDieSound");
      case "break": return getSetting("rollSound");
      case "fade": return "";
    }
  })();
  if (!src) return;

  foundry.audio.AudioHelper.play({ src, volume: 0.8, loop: false }, true);
}

/**
 * Post a chat message for pool state changes.
 */
export async function postAnnouncementChat(data: AnnouncementData): Promise<void> {
  const i18n = game.i18n!;
  let content: string;

  switch (data.type) {
    case "rise":
      content = `<em>${i18n.localize("TENSION_POOL.Announce.TensionRises")} (${data.current}/${data.max})</em>`;
      break;
    case "ease":
      content = `<em>${i18n.localize("TENSION_POOL.Announce.TensionEases")} (${data.current}/${data.max})</em>`;
      break;
    case "break":
      content = `<strong>${i18n.localize("TENSION_POOL.Announce.PoolOverflows")}</strong>`;
      break;
    case "fade":
      content = `<em>${i18n.localize("TENSION_POOL.Announce.TensionFades")}</em>`;
      break;
  }

  await ChatMessage.create({
    content: `<div class="tension-pool-announce tp-announce-${data.type}">${content}</div>`,
    speaker: { alias: i18n.localize("TENSION_POOL.Title") },
  } as any);
}

/**
 * Broadcast an announcement to all clients via socket.
 * Only the GM should call this — other clients listen and show the banner.
 */
export function broadcastAnnouncement(data: AnnouncementData): void {
  (game as Game).socket!.emit(`module.${MODULE_ID}`, {
    action: "announcement",
    data,
  });
}

/**
 * Full announce: play sound, show banner locally, broadcast banner to others, post chat.
 * Call from GM client only.
 */
export async function announce(type: AnnouncementType, current: number, max: number): Promise<void> {
  const data: AnnouncementData = { type, current, max };
  playSound(type);
  showBanner(data);
  broadcastAnnouncement(data);
  await postAnnouncementChat(data);
}
