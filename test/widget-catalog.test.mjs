import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { sourceFiles, widgetIcon } from "../scripts/package-widget.mjs";

const root = fileURLToPath(new URL("../extensions/widgets/", import.meta.url));
const read = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
const hash = (value) => createHash("sha256").update(value).digest("hex");

test("widget catalog contains all registered widgets with complete, verifiable releases", async () => {
  const names = (await fs.readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name !== "gmail-board")
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(names, [
    "debate",
    "doudizhu",
    "github-board",
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

test('Gmail Board is withdrawn while published historical packages retain their hashes', async () => {
  const catalog = await read(path.join(root, 'registry.json'));
  const withdrawn = await read(path.join(root, 'gmail-board/withdrawn.json'));
  assert.ok(!catalog.items.some(item => item.id === withdrawn.id));
  await assert.rejects(fs.access(path.join(root, 'gmail-board/source')));
  await assert.rejects(fs.access(path.join(root, 'gmail-board/manifest.json')));
  assert.ok(withdrawn.releases.length > 0);
  for (const release of withdrawn.releases) {
    assert.ok(release.reason);
    const bytes = await fs.readFile(path.resolve(root, release.package));
    assert.equal(hash(bytes), release.packageHash);
  }
});

test('new releases contain all eight metadata locales and retain earlier compatible Gomoku packages', async () => {
  const catalog = await read(path.join(root, 'registry.json'));
  const languages=['en','zh-CN','zh-TW','ja','ko','es','de','fr'];
  for(const item of catalog.items) {
    const name=item.id.split('/').at(-1);
    const manifest=await read(path.join(root,name,'manifest.json'));
    for(const language of languages) {
      assert.ok(manifest.title[language]?.trim(),`${name}: ${language} title`);
      assert.ok(manifest.description[language]?.trim(),`${name}: ${language} description`);
    }
    const release=item.releases.find(r=>r.version===manifest.version);
    assert.ok(release,`${name}: current release remains discoverable`);
    assert.equal(release.requires.sdkVersion,manifest.requires.sdkVersion);
    if(name==='synology-files')assert.equal(manifest.preview,true);
    else assert.ok(!manifest.preview,`${name}: stable release`);
  }
  const gomoku=catalog.items.find(item=>item.id.endsWith('/gomoku'));
  const modern=gomoku.releases.find(release=>release.version==='1.0.4');
  assert.equal(modern.requires.sdkVersion,'1.2.0');
  assert.ok(gomoku.releases.some(release=>!release.version.includes('-')&&['1','1.0.0','1.1.0'].includes(release.requires.sdkVersion)),'older hosts retain an eligible stable Gomoku release');
});
