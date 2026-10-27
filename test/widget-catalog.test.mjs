import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { sourceFiles, widgetIcon } from "../scripts/package-widget.mjs";

const root = fileURLToPath(new URL("../widgets/", import.meta.url));
const read = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
const hash = (value) => createHash("sha256").update(value).digest("hex");

test("widget catalog contains all registered widgets with complete, verifiable releases", async () => {
  const names = (await fs.readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(names, [
    "debate",
    "doudizhu",
    "github-board",
    "gmail-board",
    "gomoku",
    "kanban",
    "notes",
    "pocket-studio",
    "reversi",
    "shared-todo",
    "synology-files",
    "undercover",
  ]);
  const catalog = await read(path.join(root, "registry.json"));
  assert.equal(catalog.schemaVersion, 2);
  assert.equal(catalog.items.length, names.length);
  for (const name of names) {
    const dir = path.join(root, name);
    const manifest = await read(path.join(dir, "manifest.json"));
    const entry = catalog.items.find((item) => item.id === manifest.id);
    assert.ok(entry, name);
    assert.equal(entry.releases[0].version, manifest.version);
    assert.deepEqual(entry.title, manifest.title);
    assert.equal(entry.icon, await widgetIcon(dir, manifest.icon));
    const withdrawn = await read(path.join(dir, "withdrawn.json")).catch((error) => {
      if (error.code === "ENOENT") return { releases: [] };
      throw error;
    });
    for (const release of withdrawn.releases) {
      assert.ok(release.reason.trim(), "withdrawal needs a reason");
      assert.ok(!entry.releases.some((listed) => listed.version === release.version), "withdrawn versions must not be offered for installation");
    }
    const releases = [...entry.releases, ...withdrawn.releases];
    assert.equal(new Set(releases.map((release) => release.version)).size, releases.length);
    assert.deepEqual(
      (await fs.readdir(path.join(dir, "releases"))).sort(),
      releases.map((release) => release.version).sort(),
    );
    for (const release of releases) {
      assert.equal(
        release.package,
        `./${name}/releases/${release.version}/${name}.pudding-widget.json`,
      );
      const raw = await fs.readFile(path.join(root, release.package), "utf8");
      assert.equal(hash(raw), release.packageHash);
      const pkg = JSON.parse(raw);
      assert.equal(pkg.id, manifest.id);
      assert.equal(pkg.version, release.version);
      assert.deepEqual(pkg.requires, release.requires);
      assert.equal(pkg.preview, release.preview);
      assert.equal(pkg.channel, release.channel);
      assert.deepEqual(
        Object.keys(pkg.fileHashes).sort(),
        Object.keys(pkg.source.files).sort(),
      );
      for (const [file, content] of Object.entries(pkg.source.files))
        assert.equal(hash(content), pkg.fileHashes[file]);
      if (pkg.version === manifest.version) {
        assert.deepEqual(
          pkg.source.files,
          await sourceFiles(path.join(dir, "source")),
        );
        assert.deepEqual(pkg.requires, manifest.requires);
      }
    }
  }
});
