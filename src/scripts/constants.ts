export const MODULE_ID = "tension-pool-2";

type SettingsMap = {
  windowPosition: { left: number; top: number } | null;
  poolSize: number;
  iconTheme: string;
  diceSize: string;
  complicationMacro: string;
  diceCount: number;
  collapsed: boolean;
  soundEnabled: boolean;
  addDieSound: string;
  removeDieSound: string;
  rollSound: string;
};

export function getSetting<K extends keyof SettingsMap>(key: K): SettingsMap[K] {
  return (game as Game).settings!.get(MODULE_ID as any, key as any) as SettingsMap[K];
}

export function setSetting<K extends keyof SettingsMap>(key: K, value: SettingsMap[K]): Promise<SettingsMap[K]> {
  return (game as Game).settings!.set(MODULE_ID as any, key as any, value as any) as Promise<SettingsMap[K]>;
}

export function safeGetSetting<K extends keyof SettingsMap>(key: K, fallback: SettingsMap[K]): SettingsMap[K] {
  try {
    return getSetting(key) || fallback;
  } catch {
    return fallback;
  }
}

export function registerSetting<K extends keyof SettingsMap>(key: K, config: Record<string, unknown>): void {
  (game as Game).settings!.register(MODULE_ID as any, key as any, config);
}
