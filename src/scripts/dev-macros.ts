export {};

const DEV_MACRO_FOLDER = "Tension Pool 2 (Dev)";

interface DevMacroDef {
  name: string;
  command: string;
}

const macros: DevMacroDef[] = [
  {
    name: "TP: Add Die",
    command: `game.modules.get("tension-pool-2")?.api?.add();`,
  },
  {
    name: "TP: Remove Die",
    command: `game.modules.get("tension-pool-2")?.api?.remove();`,
  },
  {
    name: "TP: Roll Pool",
    command: `game.modules.get("tension-pool-2")?.api?.roll();`,
  },
  {
    name: "TP: Clear Pool",
    command: `game.modules.get("tension-pool-2")?.api?.clear();`,
  },
  {
    name: "TP: Add (3)",
    command: `game.modules.get("tension-pool-2")?.api?.add(3);`,
  },
  {
    name: "TP: Remove (2)",
    command: `game.modules.get("tension-pool-2")?.api?.remove(2);`,
  },
  {
    name: "TP: Custom Roll (4)",
    command: `game.modules.get("tension-pool-2")?.api?.customRoll(4);`,
  },
  {
    name: "TP: Get Dice Count",
    command: `const count = game.modules.get("tension-pool-2")?.api?.getDiceCount();
ui.notifications.info("Dice count: " + count);`,
  },
  {
    name: "TP: Get Pool Size",
    command: `const size = game.modules.get("tension-pool-2")?.api?.getPoolSize();
ui.notifications.info("Pool size: " + size);`,
  },
];

Hooks.once("ready", async () => {
  const g = game as Game;
  if (!g.user!.isGM) return;

  // Find or create the dev macro folder
  let folder = g.folders!.find(
    (f: any) => f.name === DEV_MACRO_FOLDER && f.type === "Macro"
  ) as any;

  if (!folder) {
    folder = await (Folder as any).create({
      name: DEV_MACRO_FOLDER,
      type: "Macro",
      sorting: "a",
    });
  }

  for (const def of macros) {
    const existing = g.macros!.find(
      (m: any) => m.name === def.name && m.folder?.id === folder.id
    );
    if (existing) continue;

    await (Macro as any).create({
      name: def.name,
      type: "script",
      scope: "global",
      command: def.command,
      folder: folder.id,
    });
  }

  console.log(`Tension Pool 2 | Dev macros ready in folder "${DEV_MACRO_FOLDER}"`);
});
