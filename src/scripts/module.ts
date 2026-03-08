import "../styles/module.css";

if (import.meta.env.DEV) {
  import("./quench.js");
}

Hooks.once("init", () => {
  console.log("Tension Pool 2 | Initializing");
});
