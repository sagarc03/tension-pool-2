import { readFileSync, writeFileSync, mkdirSync, createWriteStream, copyFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import archiver from "archiver";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Run the build first
execSync("pnpm build", { cwd: root, stdio: "inherit" });

// Read package.json
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"));
const foundry = pkg.foundry || {};

// Determine repo URL for manifest/download links
const repoUrl = pkg.repository?.url?.replace(/\.git$/, "") || `https://github.com/${pkg.repository || ""}`;
const tag = `v${pkg.version}`;

// Generate module.json
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
  url: repoUrl,
  manifest: `${repoUrl}/releases/latest/download/module.json`,
  download: `${repoUrl}/releases/download/${tag}/module.zip`,
  license: `${repoUrl}/releases/download/${tag}/LICENSE`,
  readme: `${repoUrl}/releases/download/${tag}/README.md`,
  bugs: `${repoUrl}/issues`,
  changelog: `${repoUrl}/releases`,
  ...(foundry.relationships ? {
    relationships: Object.fromEntries(
      Object.entries(foundry.relationships).map(([key, deps]) => [
        key,
        deps.filter((dep) => dep.id !== "quench"),
      ]).filter(([, deps]) => deps.length > 0)
    ),
  } : {}),
  ...(foundry.languages ? { languages: foundry.languages } : {}),
  ...(foundry.packs ? { packs: foundry.packs } : {}),
};

// Write module.json into build/ (so it's in the zip)
writeFileSync(resolve(root, "build/module.json"), JSON.stringify(moduleJson, null, 2));

// Create dist/
mkdirSync(resolve(root, "dist"), { recursive: true });

// Copy module.json to dist/
writeFileSync(resolve(root, "dist/module.json"), JSON.stringify(moduleJson, null, 2));

// Copy LICENSE and README.md to dist/
for (const file of ["LICENSE", "README.md"]) {
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
