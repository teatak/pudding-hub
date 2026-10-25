import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parse as parseYAML } from "yaml";

const root = fileURLToPath(new URL("../plugins/", import.meta.url));
const readJSON = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
const hash = (value) => createHash("sha256").update(value).digest("hex");

test("synology plugin manifest, yaml, release and registry are valid and verifiable", async () => {
  const pluginDir = path.join(root, "synology");
  const manifest = await readJSON(path.join(pluginDir, "manifest.json"));
  assert.equal(manifest.name, "synology");
  assert.equal(manifest.version, "1.0.0");
  assert.ok(manifest.title["zh-CN"]);
  assert.ok(manifest.title.en);

  const yamlContent = await fs.readFile(path.join(pluginDir, "plugin.yaml"), "utf8");
  const pluginYaml = parseYAML(yamlContent);
  assert.equal(pluginYaml.id, "synology");
  assert.equal(pluginYaml.version, "1.0.0");
  assert.ok(pluginYaml.endpoints.synology_webapi);
  assert.equal(pluginYaml.endpoints.synology_webapi.kind, "rest");
  assert.equal(pluginYaml.endpoints.synology_webapi.url_config.required, true);

  // Check connection fields for sid auto injection
  const sidField = pluginYaml.connection?.fields?.find((f) => f.id === "sid");
  assert.ok(sidField, "sid connection field must exist");
  assert.equal(sidField.secret, true);
  assert.equal(sidField.inject?.[0]?.target, "query");
  assert.equal(sidField.inject?.[0]?.name, "_sid");

  // Check skill file exists and contains expected API endpoints
  const skillFile = await fs.readFile(
    path.join(pluginDir, "skills", "file-station", "SKILL.md"),
    "utf8",
  );
  assert.ok(skillFile.includes("SYNO.FileStation.List"));
  assert.ok(skillFile.includes("SYNO.FileStation.Search"));
  assert.ok(skillFile.includes("SYNO.FileStation.Download"));

  // Check release package and checksum
  const releaseDir = path.join(pluginDir, "releases", manifest.version);
  const releaseManifest = await readJSON(path.join(releaseDir, "manifest.json"));
  assert.equal(releaseManifest.version, manifest.version);

  const pkgRaw = await fs.readFile(
    path.join(releaseDir, "synology.pudding-plugin.json"),
    "utf8",
  );
  assert.equal(hash(pkgRaw), releaseManifest.package_sha256);
  const pkg = JSON.parse(pkgRaw);
  assert.equal(pkg.plugin.id, "synology");
  assert.ok(pkg.files.some((f) => f.path === "plugin.yaml"));
  assert.ok(pkg.files.some((f) => f.path === "skills/file-station/SKILL.md"));

  // Check registry entry
  const registry = await readJSON(path.join(root, "registry.json"));
  const registryItem = registry.items.find((i) => i.name === "synology");
  assert.ok(registryItem, "synology must be listed in registry.json");
  assert.equal(registryItem.version, "1.0.0");
  assert.equal(registryItem.package_sha256, releaseManifest.package_sha256);
});
