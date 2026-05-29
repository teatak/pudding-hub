#!/usr/bin/env node
import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_KIND = "pudding.widget.package";
const WIDGET_API_VERSION = "1.0.0";
const WIDGET_API_RANGE = "^1.0.0";
const WIDGET_SCHEMA_VERSION = 1;
const PACKAGE_SCHEMA_VERSION = 1;
const REGISTRY_KIND = "pudding.widget.registry";

function usage() {
  console.log(`Usage:
  pnpm package-widget <name>
  pnpm package-widgets
`);
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    usage();
    process.exit(0);
  }
  return { all: argv.includes("--all"), name: argv.find((arg) => !arg.startsWith("--")) || "" };
}

async function readJSON(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function writeJSON(file, value) {
  await fs.writeFile(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function parseHTMLAttrs(tag) {
  const attrs = {};
  const attrRe = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of tag.matchAll(attrRe)) {
    attrs[(match[1] || "").toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function stripHTMLAttr(tag, attrName) {
  return tag.replace(new RegExp(`\\s${attrName}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s"'=<>` + "`" + `]+)`, "i"), "");
}

function scriptEscape(value) {
  return value.replace(/<\/script/gi, "<\\/script");
}

function resolveWidgetAssetPath(entryPath, rawRef) {
  const ref = rawRef.trim().replaceAll("\\", "/");
  if (!ref || ref.startsWith("/") || ref.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.includes("?") || ref.includes("#")) {
    throw new Error(`external or absolute widget asset is not allowed: ${rawRef}`);
  }
  const entryParts = entryPath.split("/");
  const baseParts = entryParts.slice(0, -1);
  const rootParts = entryParts.slice(0, 3);
  const out = [...baseParts];
  for (const part of ref.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") throw new Error(`widget asset must stay inside ${rootParts.join("/")}/: ${rawRef}`);
    out.push(part);
  }
  if (out.length <= rootParts.length || out[0] !== rootParts[0] || out[1] !== rootParts[1] || out[2] !== rootParts[2]) {
    throw new Error(`widget asset must stay inside ${rootParts.join("/")}/: ${rawRef}`);
  }
  return out.join("/");
}

async function inlineWidgetAssets(entryPath, html) {
  const readText = async (rel) => fs.readFile(path.resolve(ROOT, rel), "utf8");
  const scriptRe = /<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>\s*<\/script>/gi;
  let output = "";
  let lastIndex = 0;
  for (const match of html.matchAll(scriptRe)) {
    const tag = match[0];
    const ref = match[2];
    if (!ref) continue;
    const assetPath = resolveWidgetAssetPath(entryPath, ref);
    const js = await readText(assetPath);
    output += html.slice(lastIndex, match.index);
    output += `${stripHTMLAttr(tag.replace(/>\s*<\/script>$/i, ">"), "src")}${scriptEscape(js)}</script>`;
    lastIndex = (match.index ?? 0) + tag.length;
  }
  output += html.slice(lastIndex);

  html = output;
  output = "";
  lastIndex = 0;
  const linkRe = /<link\b[^>]*>/gi;
  for (const match of html.matchAll(linkRe)) {
    const tag = match[0];
    const attrs = parseHTMLAttrs(tag);
    const rel = attrs.rel?.split(/\s+/).map((v) => v.toLowerCase()) ?? [];
    if (!rel.includes("stylesheet") || !attrs.href) continue;
    const assetPath = resolveWidgetAssetPath(entryPath, attrs.href);
    const css = await readText(assetPath);
    output += html.slice(lastIndex, match.index);
    output += `<style data-inlined-from="${assetPath}">\n${css}\n</style>`;
    lastIndex = (match.index ?? 0) + tag.length;
  }
  output += html.slice(lastIndex);
  return output;
}

function minifyInlineCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

function minifyWidgetHTML(html) {
  const blocks = [];
  const token = (index) => `%%%PUDDING_WIDGET_RAW_${index}%%%`;
  const rawRe = /<(script|style|pre|textarea)\b[^>]*>[\s\S]*?<\/\1>/gi;
  const protectedHTML = html.replace(rawRe, (block, tagName) => {
    const index = blocks.length;
    const lower = String(tagName).toLowerCase();
    if (lower === "style") {
      blocks.push(block.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/i, (_, open, css, close) => open + minifyInlineCSS(css) + close));
    } else {
      blocks.push(block.trim());
    }
    return token(index);
  });
  let minified = protectedHTML
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
  blocks.forEach((block, index) => {
    minified = minified.replace(token(index), block);
  });
  return minified;
}

async function buildRuntimeHTML(entryPath) {
  const entryAbs = path.resolve(ROOT, entryPath);
  if (!entryAbs.startsWith(path.join(ROOT, "widgets") + path.sep)) throw new Error("widget source must be under widgets/");
  const html = await fs.readFile(entryAbs, "utf8");
  return minifyWidgetHTML(await inlineWidgetAssets(entryPath, html));
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function registryWidgetPath(name, value) {
  if (typeof value !== "string") return value;
  const rel = value.trim();
  if (!rel || rel.startsWith("/") || rel.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(rel)) return value;
  return `./${name}/${rel.replace(/^\.\//, "")}`;
}

function releaseWidgetPath(name, version, value) {
  if (typeof value !== "string") return value;
  const rel = value.trim();
  if (!rel || rel.startsWith("/") || rel.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(rel)) return value;
  return `./${name}/releases/${version}/${rel.replace(/^\.\//, "")}`;
}

function normalizedRequires(manifest) {
  const raw = manifest.requires && typeof manifest.requires === "object" && !Array.isArray(manifest.requires)
    ? { ...manifest.requires }
    : {};
  if (typeof raw.widget_api !== "string" || !raw.widget_api.trim()) {
    raw.widget_api = WIDGET_API_RANGE;
  }
  return raw;
}

async function copyDirIfExists(from, to) {
  if (!fsSync.existsSync(from)) return;
  await fs.rm(to, { recursive: true, force: true });
  await fs.cp(from, to, { recursive: true });
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

async function updateRegistry(name, manifest, packageHash) {
  const widgetVersion = manifest.widget_version || "0.0.0";
  const releaseManifest = `./${name}/releases/${widgetVersion}/manifest.json`;
  const releasePackage = `./${name}/releases/${widgetVersion}/${name}.pudding-widget.json`;
  const requires = normalizedRequires(manifest);
  const registryPath = path.join(ROOT, "widgets/registry.json");
  let registry;
  try {
    registry = await readJSON(registryPath);
  } catch {
    registry = { version: 1, kind: REGISTRY_KIND, name: "Pudding Widgets", items: [] };
  }
  const item = {
    id: manifest.id,
    kind: "widget",
    name: manifest.name || name,
    title: manifest.title,
    widget_version: widgetVersion,
    description: manifest.description || {},
    icon: releaseWidgetPath(name, widgetVersion, manifest.icon),
    manifest: releaseManifest,
    package: releasePackage,
    package_sha256: packageHash,
    requires,
    schema_version: manifest.schema_version,
    screenshots: manifest.screenshots || [],
    tags: manifest.tags || [],
    orientation: manifest.orientation || "auto",
    source: `./${name}/releases/${widgetVersion}/source/index.html`,
  };
  const items = Array.isArray(registry.items) ? registry.items : [];
  const index = items.findIndex((existing) => existing.id === manifest.id || existing.name === name);
  const previous = index >= 0 && items[index] && typeof items[index] === "object" ? items[index] : {};
  const releases = Array.isArray(previous.releases) ? previous.releases : [];
  const release = {
    widget_version: widgetVersion,
    manifest: releaseManifest,
    package: releasePackage,
    package_sha256: packageHash,
    requires,
    schema_version: manifest.schema_version,
    released_at: releases.find((entry) => entry && entry.widget_version === widgetVersion)?.released_at || todayISODate(),
  };
  const nextReleases = [
    release,
    ...releases.filter((entry) => entry && entry.widget_version !== widgetVersion),
  ];
  item.releases = nextReleases;
  if (index >= 0) items[index] = item;
  else items.push(item);
  registry.items = items.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  await writeJSON(registryPath, registry);
}

async function packageWidget(name) {
  const dir = path.join(ROOT, "widgets", name);
  const manifestPath = path.join(dir, "manifest.json");
  const manifest = await readJSON(manifestPath);
  const source = manifest.source || "./source/index.html";
  manifest.schema_version = WIDGET_SCHEMA_VERSION;
  manifest.requires = normalizedRequires(manifest);
  const entryPath = path.posix.join("widgets", name, source.replace(/^\.\//, ""));
  const html = await buildRuntimeHTML(entryPath);
  const localizedTitle = typeof manifest.title === "object" && manifest.title ? manifest.title : undefined;
  const widgetPackage = {
    kind: PACKAGE_KIND,
    schema_version: PACKAGE_SCHEMA_VERSION,
    requires: manifest.requires,
    widget: {
      id: manifest.id,
      kind: "widget",
      title: localizedTitle ? (localizedTitle["zh-CN"] || localizedTitle.en || manifest.name || name) : (manifest.title || manifest.name || name),
      version: manifest.widget_version || "0.0.0",
      size: manifest.size || "l",
      orientation: manifest.orientation || "auto",
      html,
      initial_state: manifest.initial_state || {},
    },
  };
  if (localizedTitle) widgetPackage.widget.localized_title = localizedTitle;
  if (typeof manifest.icon === "string" && manifest.icon.trim()) {
    widgetPackage.widget.icon = manifest.icon.trim();
  } else if (manifest.icon && typeof manifest.icon === "object" && !Array.isArray(manifest.icon)) {
    widgetPackage.widget.icon = manifest.icon;
  }
  const packageFilename = `${name}.pudding-widget.json`;
  const widgetVersion = manifest.widget_version || "0.0.0";
  const releaseDir = path.join(dir, "releases", widgetVersion);
  await fs.mkdir(releaseDir, { recursive: true });
  await copyDirIfExists(path.join(dir, "assets"), path.join(releaseDir, "assets"));
  await copyDirIfExists(path.join(dir, "screenshots"), path.join(releaseDir, "screenshots"));
  await copyDirIfExists(path.join(dir, "source"), path.join(releaseDir, "source"));
  const packagePath = path.join(releaseDir, packageFilename);
  const packageText = JSON.stringify(widgetPackage, null, 2) + "\n";
  await fs.writeFile(packagePath, packageText, "utf8");
  const packageHash = sha256Text(packageText);
  delete manifest.version;
  manifest.package = `./releases/${widgetVersion}/${packageFilename}`;
  manifest.package_sha256 = packageHash;
  delete manifest.card;
  delete manifest.card_sha256;
  manifest.source = source;
  await writeJSON(manifestPath, manifest);
  const releaseManifest = { ...manifest, package: `./${packageFilename}` };
  await writeJSON(path.join(releaseDir, "manifest.json"), releaseManifest);
  await updateRegistry(name, manifest, packageHash);
  console.log(`packaged ${name}: ${packageHash}`);
}

async function widgetNamesFromRegistry() {
  const registry = await readJSON(path.join(ROOT, "widgets/registry.json"));
  return (registry.items || []).map((item) => item.name).filter(Boolean);
}

const args = parseArgs(process.argv.slice(2));
const names = args.all ? await widgetNamesFromRegistry() : [args.name];
if (!names.length || !names[0]) {
  usage();
  process.exit(1);
}
for (const name of names) await packageWidget(name);
