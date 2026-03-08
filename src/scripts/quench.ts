export { };

function clickAction(action: string) {
  const btn = document.querySelector(`#tension-pool [data-action="${action}"]`) as HTMLElement;
  btn.dispatchEvent(new PointerEvent("click", { bubbles: true }));
}

async function wait(ms = 500) {
  await new Promise((r) => setTimeout(r, ms));
}

// @ts-expect-error quench module registers this hook at runtime
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

  quench.registerBatch(
    "tension-pool-2.settings",
    (context: any) => {
      const { describe, it, expect } = context;
      const g = game as Game;

      describe("Settings Registration", () => {
        it("position setting is registered", () => {
          const value = g.settings!.get("tension-pool-2" as any, "position" as any);
          expect(value).to.be.a("string");
        });

        it("poolSize setting is registered", () => {
          const value = g.settings!.get("tension-pool-2" as any, "poolSize" as any);
          expect(value).to.be.a("number");
        });

        it("iconTheme setting is registered", () => {
          const value = g.settings!.get("tension-pool-2" as any, "iconTheme" as any);
          expect(value).to.be.a("string");
        });

        it("diceSize setting is registered", () => {
          const value = g.settings!.get("tension-pool-2" as any, "diceSize" as any);
          expect(value).to.be.a("string");
        });

        it("diceCount setting is registered", () => {
          const value = g.settings!.get("tension-pool-2" as any, "diceCount" as any);
          expect(value).to.be.a("number");
        });

        it("complicationMacro setting is registered", () => {
          const value = g.settings!.get("tension-pool-2" as any, "complicationMacro" as any);
          expect(value).to.be.a("string");
        });
      });
    },
    { displayName: "Tension Pool 2: Settings" }
  );

  quench.registerBatch(
    "tension-pool-2.ui",
    (context: any) => {
      const { describe, it, expect, before, after } = context;
      const g = game as Game;

      describe("UI Rendering", () => {
        it("tension pool element exists in DOM", () => {
          const el = document.getElementById("tension-pool");
          expect(el).to.not.be.null;
        });

        it("has faded-ui class", () => {
          const el = document.getElementById("tension-pool");
          expect(el!.classList.contains("faded-ui")).to.be.true;
        });

        it("is positioned fixed", () => {
          const el = document.getElementById("tension-pool");
          expect(el!.style.position).to.equal("fixed");
        });

        it("has tooltip direction set", () => {
          const el = document.getElementById("tension-pool");
          expect(el!.getAttribute("data-tooltip-direction")).to.be.oneOf(["LEFT", "RIGHT"]);
        });
      });

      if (g.user!.isGM) {
        describe("GM Controls", () => {
          it("shows add die button", () => {
            const btn = document.querySelector('#tension-pool [data-action="addDie"]');
            expect(btn).to.not.be.null;
          });

          it("shows remove die button", () => {
            const btn = document.querySelector('#tension-pool [data-action="removeDie"]');
            expect(btn).to.not.be.null;
          });

          it("shows roll pool button", () => {
            const btn = document.querySelector('#tension-pool [data-action="rollPool"]');
            expect(btn).to.not.be.null;
          });

          it("shows clear pool button", () => {
            const btn = document.querySelector('#tension-pool [data-action="clearPool"]');
            expect(btn).to.not.be.null;
          });
        });

        describe("Pool Manipulation", () => {
          let originalCount: number;

          before(async () => {
            originalCount = g.settings!.get("tension-pool-2" as any, "diceCount" as any) as number;
            await g.settings!.set("tension-pool-2" as any, "diceCount" as any, 0 as any);
            await wait();
          });

          after(async () => {
            await g.settings!.set("tension-pool-2" as any, "diceCount" as any, originalCount as any);
            await wait();
          });

          it("add die increments count", async () => {
            await g.settings!.set("tension-pool-2" as any, "diceCount" as any, 0 as any);
            await wait();
            clickAction("addDie");
            await wait();
            const count = g.settings!.get("tension-pool-2" as any, "diceCount" as any) as number;
            expect(count).to.equal(1);
          });

          it("remove die decrements count", async () => {
            await g.settings!.set("tension-pool-2" as any, "diceCount" as any, 2 as any);
            await wait();
            clickAction("removeDie");
            await wait();
            const count = g.settings!.get("tension-pool-2" as any, "diceCount" as any) as number;
            expect(count).to.equal(1);
          });

          it("clear pool sets count to 0", async () => {
            await g.settings!.set("tension-pool-2" as any, "diceCount" as any, 3 as any);
            await wait();
            clickAction("clearPool");
            await wait();
            const count = g.settings!.get("tension-pool-2" as any, "diceCount" as any) as number;
            expect(count).to.equal(0);
          });

          it("remove die does not go below 0", async () => {
            await g.settings!.set("tension-pool-2" as any, "diceCount" as any, 0 as any);
            await wait();
            clickAction("removeDie");
            await wait();
            const count = g.settings!.get("tension-pool-2" as any, "diceCount" as any) as number;
            expect(count).to.equal(0);
          });
        });

        describe("Roll Pool", function (this: any) {
          this.timeout(10000);
          let originalCount: number;

          before(async () => {
            originalCount = g.settings!.get("tension-pool-2" as any, "diceCount" as any) as number;
          });

          after(async () => {
            await g.settings!.set("tension-pool-2" as any, "diceCount" as any, originalCount as any);
            await wait();
          });

          it("clicking roll creates a chat message", async () => {
            await g.settings!.set("tension-pool-2" as any, "diceCount" as any, 2 as any);
            await wait();
            const messageCountBefore = g.messages!.size;
            clickAction("rollPool");
            await wait(5000);
            const messageCountAfter = g.messages!.size;
            expect(messageCountAfter).to.be.greaterThan(messageCountBefore);
          });

          it("roll clears the pool", async () => {
            await g.settings!.set("tension-pool-2" as any, "diceCount" as any, 3 as any);
            await wait();
            clickAction("rollPool");
            await wait(5000);
            const count = g.settings!.get("tension-pool-2" as any, "diceCount" as any) as number;
            expect(count).to.equal(0);
          });
        });
      }
    },
    { displayName: "Tension Pool 2: UI & Controls" }
  );

  quench.registerBatch(
    "tension-pool-2.tension-die",
    (context: any) => {
      const { describe, it, expect } = context;

      describe("TensionDie Registration", () => {
        it("TensionDie is registered in CONFIG.Dice.terms", () => {
          expect((CONFIG as any).Dice.terms["t"]).to.not.be.undefined;
        });

        it("TensionDie has denomination 't'", () => {
          expect((CONFIG as any).Dice.terms["t"].DENOMINATION).to.equal("t");
        });
      });

      describe("Tension Roll", () => {
        it("can evaluate a dt roll", async () => {
          const roll = new Roll("3dt") as any;
          await roll.evaluate();
          expect(roll.terms[0].results).to.have.lengthOf(3);
        });

        it("dt results are between 1 and face count", async () => {
          const roll = new Roll("6dt") as any;
          await roll.evaluate();
          const diceSize = (game as Game).settings!.get("tension-pool-2" as any, "diceSize" as any) as string || "d6";
          const faces = parseInt(diceSize.replace("d", ""), 10);
          for (const r of roll.terms[0].results) {
            expect(r.result).to.be.at.least(1);
            expect(r.result).to.be.at.most(faces);
          }
        });

        it("dt total counts 1s", async () => {
          const roll = new Roll("10dt") as any;
          await roll.evaluate();
          const onesCount = roll.terms[0].results.filter((r: any) => r.result === 1).length;
          expect(roll.terms[0].total).to.equal(onesCount);
        });
      });
    },
    { displayName: "Tension Pool 2: Tension Die" }
  );
});
