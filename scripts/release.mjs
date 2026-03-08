import { writeFileSync, mkdirSync, createWriteStream, copyFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import archiver from "archiver";
import { generateModuleJsonData } from "./module-json.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Run the build first
execSync("pnpm build", { cwd: root, stdio: "inherit" });

const moduleJson = generateModuleJsonData(root, { release: true });

// Write module.json into build/ (so it's in the zip)
writeFileSync(resolve(root, "build/module.json"), JSON.stringify(moduleJson, null, 2));

// Create dist/
mkdirSync(resolve(root, "dist"), { recursive: true });

// Copy module.json to dist/
writeFileSync(resolve(root, "dist/module.json"), JSON.stringify(moduleJson, null, 2));

// Copy LICENSE and README.md to dist/
for (const file of ["LICENSE", "README.md", "THIRD_PARTY_ASSETS.md"]) {
  const src = resolve(root, file);
  if (existsSync(src)) {
    copyFileSync(src, resolve(root, "dist", file));
  }
}

// Zip build/ contents into dist/module.zip
const output = createWriteStream(resolve(root, "dist/module.zip"));
const archive = archiver("zip", { zlib: { level: 9 } });

await new Promise((resolvePromise, reject) => {
  output.on("close", resolvePromise);
  archive.on("error", reject);
  archive.pipe(output);
  archive.directory(resolve(root, "build"), false);
  archive.finalize();
});

console.log(`Release artifacts written to dist/`);
console.log(`  dist/module.json`);
console.log(`  dist/module.zip (${archive.pointer()} bytes)`);
