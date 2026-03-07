Hooks.on("quenchReady", (quench: any) => {
  quench.registerBatch(
    "tension-pool-2.basic",
    (context: any) => {
      const { describe, it, expect } = context;

      describe("Tension Pool 2", () => {
        it("module is active", () => {
          const module = (game as any).modules.get("tension-pool-2");
          expect(module).to.not.be.undefined;
          expect(module.active).to.be.true;
        });
      });
    },
    { displayName: "Tension Pool 2: Basic" }
  );
});
