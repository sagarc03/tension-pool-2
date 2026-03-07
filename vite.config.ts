import { defineConfig } from "vite";
import { resolve } from "path";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
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

function generateModuleJson(root: string, outDir: string) {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"));
  const foundry = pkg.foundry || {};
  const moduleJson = {
    id: foundry.id || pkg.name,
    title: foundry.title || pkg.name,
    description: pkg.description || "",
    version: pkg.version,
    authors: pkg.authors || [],
    compatibility: foundry.compatibility || {},
    socket: foundry.socket || false,
    esmodules: ["scripts/module.js"],
    styles: ["styles/module.css"],
    ...(foundry.relationships ? { relationships: foundry.relationships } : {}),
    ...(foundry.languages ? { languages: foundry.languages } : {}),
  };
  writeFileSync(
    resolve(outDir, "module.json"),
    JSON.stringify(moduleJson, null, 2)
  );
}

export default defineConfig({
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
      closeBundle() {
        const root = import.meta.dirname!;
        const outDir = resolve(root, "build");

        // Generate module.json for dev
        generateModuleJson(root, outDir);

        // Copy templates
        try {
          copyDir(resolve(root, "src/templates"), resolve(outDir, "templates"));
        } catch {
          // No templates yet, that's fine
        }
      },
    },
  ],
});
