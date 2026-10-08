#!/usr/bin/env node
// Source package validation is owned by pudding-core, not a second Hub runtime.
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const read = async (file) => JSON.parse(await fs.readFile(file, "utf8"));

export async function sourceFiles(root) {
  const files = {};
  async function visit(dir) {
    for (const entry of (await fs.readdir(dir, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const file = path.join(dir, entry.name),
        name = path.relative(root, file).split(path.sep).join("/");
      if (entry.isSymbolicLink())
        throw new Error(`Symlinks are not source files: ${name}`);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile())
        files[name] = new TextDecoder("utf-8", { fatal: true }).decode(
          await fs.readFile(file),
        );
      else throw new Error(`Unsupported source file: ${name}`);
    }
  }
  await visit(root);
  return Object.fromEntries(
    Object.entries(files).sort(([a], [b]) => a.localeCompare(b)),
  );
}

// Keep the original artwork self-contained in both catalog and installed item.
export async function widgetIcon(dir, icon) {
  if (icon === undefined) return undefined;
  if (typeof icon !== "string" || !/^\.\/assets\/[a-zA-Z0-9_-]+\.svg$/.test(icon))
    throw new Error("Widget icon must be ./assets/<name>.svg");
  const file = path.join(await fs.realpath(dir), icon);
  if (!(await fs.lstat(file)).isFile() || await fs.realpath(file) !== file)
    throw new Error("Widget icon must be a local file without symlinks");
  return "data:image/svg+xml;base64," + (await fs.readFile(file)).toString("base64");
}

export async function packageWidget(
  name,
  { root = ROOT, core = process.env.PUDDING_CORE_DIR, dev = false } = {},
) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error("Invalid widget name");
  if (!core)
    throw new Error(
      "Set PUDDING_CORE_DIR to a pudding-core checkout with the source-package contract",
    );
  const policy = await read(path.join(core, "contracts/widget.json"));
  if (!policy.distribution)
    throw new Error("Core does not support widget source distribution");
  const dir = path.join(root, "widgets", name),
    manifest = await read(path.join(dir, "manifest.json"));
  if (!manifest.id?.endsWith("/widgets/" + name))
    throw new Error("Widget ID must match its directory");
  const files = await sourceFiles(path.join(dir, "source"));
  const pkg = {
    kind: policy.distribution.kind,
    schemaVersion: policy.distribution.schemaVersion,
    id: manifest.id,
    version: manifest.version,
    title: manifest.title,
    description: manifest.description,
    icon: await widgetIcon(dir, manifest.icon),
    requires: manifest.requires,
    source: { files },
    fileHashes: Object.fromEntries(
      Object.entries(files).map(([name, text]) => [name, hash(text)]),
    ),
  };
  const text = json(pkg);
  execFileSync("go", ["run", "./cmd/widget-package"], {
    cwd: core,
    input: text,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const packageHash = hash(text);
  const releaseDir = path.join(
    dir,
    dev ? "dev" : `releases/${manifest.version}`,
  );
  const packageName = `${name}.pudding-widget.json`;
  if (!dev) {
    try {
      const existing = await fs.readFile(
        path.join(releaseDir, packageName),
        "utf8",
      );
      if (existing !== text)
        throw new Error(
          `Immutable release ${name}@${manifest.version}: bump the version`,
        );
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      try {
        await fs.access(releaseDir);
        throw new Error("Incomplete release directory already exists");
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
    }
  }
  await fs.mkdir(releaseDir, { recursive: true });
  await fs.writeFile(path.join(releaseDir, packageName), text);
  if (dev) return { packageHash, pkg };
  const registryPath = path.join(root, "widgets/registry.json");
  const registry = await read(registryPath);
  const previous = registry.items.find((item) => item.id === manifest.id);
  const release = {
    version: manifest.version,
    package: `./${name}/releases/${manifest.version}/${packageName}`,
    packageHash,
    requires: manifest.requires,
  };
  // Retired HTML releases remain immutable on disk, but are not installable candidates.
  const releases = [
    release,
    ...(previous?.releases || []).filter(
      (r) => r.requires?.protocolVersion && r.version !== manifest.version,
    ),
  ];
  const item = {
    id: manifest.id,
    title: manifest.title,
    description: manifest.description,
    icon: pkg.icon,
    releases,
  };
  registry.items = [
    ...registry.items.filter((item) => item.id !== manifest.id),
    item,
  ].sort((a, b) => a.id.localeCompare(b.id));
  registry.schemaVersion = policy.distribution.schemaVersion;
  delete registry.schema_version;
  await fs.writeFile(registryPath, json(registry));
  console.log(`packaged ${name}@${manifest.version}: ${packageHash}`);
  return { packageHash, pkg };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  if (args.includes("--help"))
    console.log(
      "PUDDING_CORE_DIR=/path/to/pudding-core npm run package-widget -- <name> [--dev]\nPUDDING_CORE_DIR=/path/to/pudding-core npm run package-widgets",
    );
  else {
    const names = args.includes("--all")
      ? (await fs.readdir(path.join(ROOT, "widgets"), { withFileTypes: true }))
          .filter((e) => e.isDirectory())
          .map((e) => e.name)
      : [args.find((a) => !a.startsWith("--"))];
    for (const name of names)
      await packageWidget(name, { dev: args.includes("--dev") });
  }
}
