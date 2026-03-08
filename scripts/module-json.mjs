import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Generate a Foundry module.json object from package.json.
 *
 * @param {string} root - Project root directory
 * @param {{ release?: boolean }} options
 *   - release: if true, adds manifest/download URLs, filters dev-only deps (quench)
 */
export function generateModuleJsonData(root, { release = false } = {}) {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"));
  const foundry = pkg.foundry || {};

  const repoUrl = pkg.repository?.url?.replace(/\.git$/, "")
    || `https://github.com/${pkg.repository || ""}`;
  const tag = `v${pkg.version}`;

  // Base fields shared by dev and release
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
    ...(repoUrl ? { url: repoUrl } : {}),
  };

  // Release-only: manifest/download URLs
  if (release) {
    Object.assign(moduleJson, {
      manifest: `${repoUrl}/releases/latest/download/module.json`,
      download: `${repoUrl}/releases/download/${tag}/module.zip`,
      license: `${repoUrl}/releases/download/${tag}/LICENSE`,
      readme: `${repoUrl}/releases/download/${tag}/README.md`,
      bugs: `${repoUrl}/issues`,
      changelog: `${repoUrl}/releases`,
    });
  }

  // Relationships: release filters out dev-only deps (quench)
  if (foundry.relationships) {
    if (release) {
      const filtered = Object.fromEntries(
        Object.entries(foundry.relationships).map(([key, deps]) => [
          key,
          Array.isArray(deps) ? deps.filter((dep) => dep.id !== "quench") : deps,
        ]).filter(([, deps]) => Array.isArray(deps) ? deps.length > 0 : true)
      );
      if (Object.keys(filtered).length > 0) {
        moduleJson.relationships = filtered;
      }
    } else {
      moduleJson.relationships = foundry.relationships;
    }
  }

  if (foundry.languages) moduleJson.languages = foundry.languages;
  if (foundry.packs) moduleJson.packs = foundry.packs;

  return moduleJson;
}
