#!/usr/bin/env node
import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_KIND = "pudding.app.package";
const PACKAGE_SCHEMA_VERSION = 1;
const APP_MANIFEST_KIND = "pudding.app.manifest";
const REGISTRY_KIND = "pudding.app.registry";
const REGISTRY_NAME = "pudding-apps";
const REGISTRY_TITLE = {
  "zh-CN": "Pudding 应用",
  "zh-TW": "Pudding 應用",
  en: "Pudding Apps",
};

function usage() {
  console.log(`Usage:
  pnpm package-app <name>
  pnpm package-apps
`);
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    usage();
    process.exit(0);
  }
  return {
    all: argv.includes("--all"),
    name: argv.find((arg) => !arg.startsWith("--")) || "",
  };
}

async function readJSON(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function writeJSON(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function requireString(value, label) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function todayISODate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function releaseAppPath(name, version, value) {
  if (typeof value !== "string") return value;
  const rel = value.trim();
  if (!rel || rel.startsWith("/") || rel.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(rel)) return value;
  return `./${name}/releases/${version}/${rel.replace(/^\.\//, "")}`;
}

function releaseFileExists(value) {
  if (typeof value !== "string") return false;
  const rel = value.replace(/^\.\//, "");
  return fsSync.existsSync(path.join(ROOT, "apps", rel));
}

function iconSVGPath(icon) {
  if (!icon) return "";
  if (typeof icon === "string") return icon;
  if (typeof icon === "object" && typeof icon.svg === "string") return icon.svg;
  return "";
}

function rewriteReleaseIcon(name, version, icon) {
  if (!icon) return undefined;
  if (typeof icon === "string") return releaseAppPath(name, version, icon);
  if (typeof icon === "object" && !Array.isArray(icon)) {
    return {
      ...icon,
      svg: typeof icon.svg === "string" ? releaseAppPath(name, version, icon.svg) : icon.svg,
    };
  }
  return undefined;
}

function normalizeRegistryRelease(entry) {
  return entry && typeof entry === "object" && typeof entry.version === "string" ? entry : null;
}

function releaseChannel(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isPreviewRelease(value) {
  const channel = releaseChannel(value?.channel);
  return Boolean(value?.preview || channel === "preview" || channel === "dev");
}

function withReleaseMetadata(target, source) {
  if (typeof source.channel === "string" && source.channel.trim()) {
    target.channel = source.channel.trim();
  }
  if (source.preview === true) {
    target.preview = true;
  }
  return target;
}

async function packageApp(name) {
  const appDir = path.join(ROOT, "apps", name);
  const manifest = await readJSON(path.join(appDir, "manifest.json"));
  if (manifest.kind && manifest.kind !== APP_MANIFEST_KIND) {
    throw new Error(`unsupported app manifest kind: ${manifest.kind}`);
  }
  const appID = requireString(manifest.name, `app ${name} manifest.name`);
  const version = requireString(manifest.version, `app ${name} manifest.version`);
  const fileList = Array.isArray(manifest.files) ? manifest.files : [];
  if (fileList.length === 0) throw new Error(`app ${name} manifest.files is required`);

  const files = [];
  for (const rel of fileList) {
    const file = requireString(rel, `app ${name} file path`).replace(/^\.\//, "");
    if (file.startsWith("/") || file.includes("..")) throw new Error(`invalid app file path: ${file}`);
    files.push({
      path: file,
      content: await fs.readFile(path.join(appDir, file), "utf8"),
    });
  }
  if (!files.some((file) => file.path === "app.yaml")) throw new Error(`app ${name} must package app.yaml`);

  const pkg = {
    kind: PACKAGE_KIND,
    schema_version: PACKAGE_SCHEMA_VERSION,
    app: {
      id: appID,
      name: manifest.title?.en || manifest.title?.["zh-CN"] || appID,
      version,
      description: manifest.description?.en || manifest.description?.["zh-CN"] || "",
    },
    files,
  };
  const packageFilename = `${name}.pudding-app.json`;
  const releaseDir = path.join(appDir, "releases", version);
  await fs.mkdir(releaseDir, { recursive: true });
  const iconRelRaw = iconSVGPath(manifest.icon);
  if (iconRelRaw) {
    const iconRel = iconRelRaw.replace(/^\.\//, "");
    await fs.mkdir(path.dirname(path.join(releaseDir, iconRel)), { recursive: true });
    await fs.copyFile(path.join(appDir, iconRel), path.join(releaseDir, iconRel));
  }
  const packageText = JSON.stringify(pkg, null, 2) + "\n";
  const packageHash = sha256Text(packageText);
  await fs.writeFile(path.join(releaseDir, packageFilename), packageText, "utf8");

  const rootManifest = buildRootManifest(name, manifest, version, packageFilename, packageHash);
  const releaseManifest = buildReleaseManifest(manifest, packageFilename, packageHash);
  await writeJSON(path.join(appDir, "manifest.json"), rootManifest);
  await writeJSON(path.join(releaseDir, "manifest.json"), releaseManifest);
  await updateRegistry(name, rootManifest, packageHash);
}

function buildRootManifest(name, manifest, version, packageFilename, packageHash) {
  return withReleaseMetadata({
    kind: APP_MANIFEST_KIND,
    schema_version: 1,
    id: manifest.id || `teatak/pudding-hub/apps/${name}`,
    name: manifest.name,
    title: manifest.title,
    version,
    description: manifest.description || {},
    icon: manifest.icon,
    files: manifest.files || [],
    manifest: `./releases/${version}/manifest.json`,
    package: `./releases/${version}/${packageFilename}`,
    package_sha256: packageHash,
    requires: manifest.requires || { pudding_app: "^1.0.0" },
    tags: manifest.tags || [],
  }, manifest);
}

function buildReleaseManifest(manifest, packageFilename, packageHash) {
  return withReleaseMetadata({
    kind: APP_MANIFEST_KIND,
    schema_version: 1,
    id: manifest.id,
    name: manifest.name,
    title: manifest.title,
    version: manifest.version,
    icon: manifest.icon,
    package: `./${packageFilename}`,
    package_sha256: packageHash,
    requires: manifest.requires || { pudding_app: "^1.0.0" },
  }, manifest);
}

async function updateRegistry(name, manifest, packageHash) {
  const registryPath = path.join(ROOT, "apps/registry.json");
  let registry;
  try {
    registry = await readJSON(registryPath);
  } catch {
    registry = { kind: REGISTRY_KIND, schema_version: 1, name: REGISTRY_NAME, title: REGISTRY_TITLE, items: [] };
  }
  registry.kind = REGISTRY_KIND;
  registry.schema_version = 1;
  if (typeof registry.name !== "string" || !registry.name.trim()) registry.name = REGISTRY_NAME;
  if (!registry.title || typeof registry.title !== "object" || Array.isArray(registry.title)) registry.title = REGISTRY_TITLE;

  const releaseManifest = `./${name}/releases/${manifest.version}/manifest.json`;
  const releasePackage = `./${name}/releases/${manifest.version}/${name}.pudding-app.json`;
  const requires = manifest.requires || { pudding_app: "^1.0.0" };
  const item = {
    id: manifest.id,
    name: manifest.name,
    title: manifest.title,
    description: manifest.description || {},
    icon: rewriteReleaseIcon(name, manifest.version, manifest.icon),
    tags: manifest.tags || [],
  };
  const items = Array.isArray(registry.items) ? registry.items : [];
  const index = items.findIndex((existing) => existing.id === item.id || existing.name === item.name);
  const previous = index >= 0 && items[index] && typeof items[index] === "object" ? items[index] : {};
  const releases = (Array.isArray(previous.releases) ? previous.releases : [])
    .map((entry) => normalizeRegistryRelease(entry))
    .filter((entry) => entry && releaseFileExists(entry.manifest));
  const release = withReleaseMetadata({
    version: manifest.version,
    manifest: releaseManifest,
    package: releasePackage,
    package_sha256: packageHash,
    requires,
    released_at: releases.find((entry) => entry.version === manifest.version)?.released_at || todayISODate(),
  }, manifest);
  const nextReleases = [release, ...releases.filter((entry) => entry.version !== manifest.version)];
  nextReleases.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
  const defaultRelease = nextReleases.find((entry) => !isPreviewRelease(entry));
  if (defaultRelease) {
    item.version = defaultRelease.version;
    item.manifest = defaultRelease.manifest;
    item.package = defaultRelease.package;
    item.package_sha256 = defaultRelease.package_sha256;
    item.requires = defaultRelease.requires;
  }
  item.releases = nextReleases;
  if (index >= 0) {
    items[index] = item;
  } else {
    items.push(item);
  }
  items.sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
  registry.items = items;
  await writeJSON(registryPath, registry);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let names = [];
  if (args.all) {
    names = (await fs.readdir(path.join(ROOT, "apps"), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } else if (args.name) {
    names = [args.name];
  } else {
    usage();
    process.exit(1);
  }
  for (const name of names) {
    await packageApp(name);
    console.log(`packaged app ${name}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
