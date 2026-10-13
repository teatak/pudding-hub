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

test("widget catalog contains only Todo and Gomoku with complete, verifiable releases", async () => {
  const names = (await fs.readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(names, ["gomoku", "shared-todo"]);
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
    assert.deepEqual(
      (await fs.readdir(path.join(dir, "releases"))).sort(),
      entry.releases.map((release) => release.version).sort(),
    );
    for (const release of entry.releases) {
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
