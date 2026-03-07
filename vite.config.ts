import { defineConfig } from "vite";
import { resolve } from "path";
import { copyFileSync, mkdirSync, readdirSync, statSync } from "fs";

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
      name: "copy-templates",
      closeBundle() {
        try {
          copyDir(
            resolve(import.meta.dirname!, "src/templates"),
            resolve(import.meta.dirname!, "build/templates")
          );
        } catch {
          // No templates yet, that's fine
        }
      },
    },
  ],
});
