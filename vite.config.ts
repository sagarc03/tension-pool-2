import { defineConfig } from "vite";
import { resolve } from "path";
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "fs";

function copyDir(src: string, dest: string) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = resolve(src, entry);
    const destPath = resolve(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

export default defineConfig(({ mode }) => ({
  define: {
    "import.meta.env.DEV": JSON.stringify(mode === "development"),
  },
  build: {
    outDir: "build",
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: resolve(import.meta.dirname!, "src/scripts/module.ts"),
      formats: ["es"],
      fileName: "scripts/module",
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.some((n) => n.endsWith(".css"))) {
            return "styles/module.css";
          }
          return "assets/[name].[ext]";
        },
      },
    },
  },
  plugins: [
    {
      name: "foundry-module",
      async closeBundle() {
        const root = import.meta.dirname!;
        const outDir = resolve(root, "build");

        // Generate dev module.json (shared logic in scripts/module-json.mjs)
        const { generateModuleJsonData } = await import("./scripts/module-json.mjs");
        const moduleJson = generateModuleJsonData(root);
        writeFileSync(
          resolve(outDir, "module.json"),
          JSON.stringify(moduleJson, null, 2)
        );

        // Copy static directories
        for (const dir of ["templates", "lang", "assets"]) {
          try {
            copyDir(resolve(root, "src", dir), resolve(outDir, dir));
          } catch {
            // Directory may not exist yet, that's fine
          }
        }
      },
    },
  ],
}));
