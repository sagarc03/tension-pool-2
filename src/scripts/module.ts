import "../styles/module.css";
import { TensionPoolApp } from "./tension-pool-app.js";

if (import.meta.env.DEV) {
  import("./quench.js");
}

let poolApp: TensionPoolApp | null = null;

Hooks.once("init", () => {
  console.log("Tension Pool 2 | Initializing");

  (game as Game).settings!.register("tension-pool-2" as any, "position" as any, {
    name: "TENSION_POOL.Settings.Position.Name",
    hint: "TENSION_POOL.Settings.Position.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      left: "TENSION_POOL.Settings.Position.Left",
      right: "TENSION_POOL.Settings.Position.Right",
    },
    default: "left",
    onChange: () => {
      poolApp?.render({ force: true });
    },
  } as any);
});

Hooks.on("ready", () => {
  poolApp = new TensionPoolApp();
  poolApp.render({ force: true });
});
