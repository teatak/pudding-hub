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
const REGISTRY_NAME = "pudding-widgets";
const REGISTRY_TITLE = {
  "zh-CN": "Pudding 小组件",
  "zh-TW": "Pudding 小組件",
  en: "Pudding Widgets",
};
const WIDGET_MANIFEST_KIND = "pudding.widget.manifest";
const WIDGET_SIZE_VALUES = new Set(["sm", "md", "lg"]);

function usage() {
  console.log(`Usage:
  pnpm package-widget <name>
  pnpm package-widget <name> --dev
  pnpm package-widgets
`);
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    usage();
    process.exit(0);
  }
  return {
    all: argv.includes("--all"),
    dev: argv.includes("--dev"),
    name: argv.find((arg) => !arg.startsWith("--")) || "",
  };
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

function isJSBlock(openTag) {
  const attrs = parseHTMLAttrs(openTag);
  const type = (attrs.type ?? "").trim().toLowerCase();
  return type === "" || type === "module" || type === "text/javascript" || type === "application/javascript";
}

function isIdentifierChar(ch) {
  return /[A-Za-z0-9_$]/.test(ch);
}

function needsJSSpace(prev, next) {
  if (!prev || !next) return false;
  if (isIdentifierChar(prev) && isIdentifierChar(next)) return true;
  if ((prev === "+" && next === "+") || (prev === "-" && next === "-")) return true;
  if ((isIdentifierChar(prev) || prev === ")") && next === "/") return true;
  return false;
}

function previousJSWord(out) {
  const match = out.match(/[A-Za-z_$][A-Za-z0-9_$]*$/);
  return match?.[0] ?? "";
}

function probablyRegexStart(out) {
  const trimmed = out.trimEnd();
  if (!trimmed) return true;
  const prev = trimmed[trimmed.length - 1] ?? "";
  if ("({[=,:;!&|?+-*~^<>".includes(prev)) return true;
  return /^(return|throw|case|delete|typeof|void|new|yield|await|else|do|in|of)$/.test(previousJSWord(trimmed));
}

function copyQuotedJS(source, start, quote) {
  let out = quote;
  let i = start + 1;
  for (; i < source.length; i += 1) {
    const ch = source[i] ?? "";
    out += ch;
    if (ch === "\\") {
      i += 1;
      out += source[i] ?? "";
      continue;
    }
    if (ch === quote) {
      i += 1;
      break;
    }
  }
  return { text: out, next: i };
}

function copyRegexJS(source, start) {
  let out = "/";
  let inClass = false;
  let i = start + 1;
  for (; i < source.length; i += 1) {
    const ch = source[i] ?? "";
    out += ch;
    if (ch === "\\") {
      i += 1;
      out += source[i] ?? "";
      continue;
    }
    if (ch === "[") inClass = true;
    else if (ch === "]") inClass = false;
    else if (ch === "/" && !inClass) {
      i += 1;
      while (/[A-Za-z]/.test(source[i] ?? "")) {
        out += source[i];
        i += 1;
      }
      break;
    }
  }
  return { text: out, next: i };
}

function minifyInlineJS(js) {
  let out = "";
  let pendingSpace = false;
  let i = 0;
  const append = (text) => {
    const first = text[0] ?? "";
    const prev = out.trimEnd().slice(-1);
    if (pendingSpace && needsJSSpace(prev, first)) out += " ";
    pendingSpace = false;
    out += text;
  };

  while (i < js.length) {
    const ch = js[i] ?? "";
    const next = js[i + 1] ?? "";
    if (/\s/.test(ch)) {
      pendingSpace = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "/") {
      i += 2;
      while (i < js.length && js[i] !== "\n" && js[i] !== "\r") i += 1;
      pendingSpace = true;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < js.length && !(js[i] === "*" && js[i + 1] === "/")) i += 1;
      i += 2;
      pendingSpace = true;
      continue;
    }
    if (ch === "'" || ch === "\"" || ch === "`") {
      const copied = copyQuotedJS(js, i, ch);
      append(copied.text);
      i = copied.next;
      continue;
    }
    if (ch === "/" && probablyRegexStart(out)) {
      const copied = copyRegexJS(js, i);
      append(copied.text);
      i = copied.next;
      continue;
    }
    append(ch);
    i += 1;
  }
  return out.trim();
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
    } else if (lower === "script") {
      blocks.push(block.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/i, (_, open, js, close) => open + (isJSBlock(open) ? minifyInlineJS(js) : js.trim()) + close));
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

function imageMimeFromPath(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  throw new Error(`unsupported widget icon file type: ${file}`);
}

async function packageWidgetIcon(name) {
  const assetPath = path.posix.join("widgets", name, "assets", "icon.svg");
  const abs = path.resolve(ROOT, assetPath);
  if (!fsSync.existsSync(abs)) return undefined;
  const bytes = await fs.readFile(abs);
  if (bytes.byteLength > 512 * 1024) throw new Error(`widget icon is too large: ${assetPath}`);
  return `data:${imageMimeFromPath(assetPath)};base64,${bytes.toString("base64")}`;
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
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function requireWidgetVersion(manifest) {
  const version = typeof manifest.version === "string" ? manifest.version.trim() : "";
  if (!version) throw new Error(`widget ${manifest.name || manifest.id || "unknown"} is missing manifest.version`);
  return version;
}

function requireWidgetID(manifest) {
  const id = typeof manifest.id === "string" ? manifest.id.trim() : "";
  if (!id) throw new Error(`widget ${manifest.name || "unknown"} is missing manifest.id`);
  return id;
}

function normalizedWidgetSize(manifest) {
  const size = typeof manifest.size === "string" ? manifest.size.trim() : "";
  if (!size) return "lg";
  if (!WIDGET_SIZE_VALUES.has(size)) {
    throw new Error(`widget ${manifest.name || manifest.id || "unknown"} manifest.size must be sm, md, or lg`);
  }
  return size;
}

function buildRootManifest(manifest, packageRef, packageHash) {
  const widgetVersion = requireWidgetVersion(manifest);
  const widgetID = requireWidgetID(manifest);
  return {
    kind: WIDGET_MANIFEST_KIND,
    schema_version: WIDGET_SCHEMA_VERSION,
    id: widgetID,
    name: manifest.name,
    title: manifest.title,
    version: widgetVersion,
    description: manifest.description || {},
    icon: manifest.icon ? `./${String(manifest.icon).replace(/^\.\//, "")}` : undefined,
    screenshots: manifest.screenshots || [],
    tags: manifest.tags || [],
    size: normalizedWidgetSize(manifest),
    orientation: manifest.orientation || "auto",
    author: manifest.author || { name: "Pudding" },
    package: packageRef,
    package_sha256: packageHash,
    requires: normalizedRequires(manifest),
  };
}

function buildReleaseManifest(manifest, packageFilename, packageHash) {
  const widgetVersion = requireWidgetVersion(manifest);
  const widgetID = requireWidgetID(manifest);
  return {
    kind: WIDGET_MANIFEST_KIND,
    schema_version: WIDGET_SCHEMA_VERSION,
    id: widgetID,
    name: manifest.name,
    title: manifest.title,
    version: widgetVersion,
    icon: manifest.icon ? `./${String(manifest.icon).replace(/^\.\//, "")}` : undefined,
    size: normalizedWidgetSize(manifest),
    orientation: manifest.orientation || "auto",
    package: `./${packageFilename}`,
    package_sha256: packageHash,
    requires: normalizedRequires(manifest),
  };
}

async function updateRegistry(name, manifest, packageHash) {
  const widgetVersion = requireWidgetVersion(manifest);
  const widgetID = requireWidgetID(manifest);
  const releaseManifest = `./${name}/releases/${widgetVersion}/manifest.json`;
  const releasePackage = `./${name}/releases/${widgetVersion}/${name}.pudding-widget.json`;
  const requires = normalizedRequires(manifest);
  const registryPath = path.join(ROOT, "widgets/registry.json");
  let registry;
  try {
    registry = await readJSON(registryPath);
  } catch {
    registry = { schema_version: 1, kind: REGISTRY_KIND, name: REGISTRY_NAME, title: REGISTRY_TITLE, items: [] };
  }
  registry.kind = REGISTRY_KIND;
  registry.schema_version = WIDGET_SCHEMA_VERSION;
  if (typeof registry.name !== "string" || !registry.name.trim()) registry.name = REGISTRY_NAME;
  if (!registry.title || typeof registry.title !== "object" || Array.isArray(registry.title)) registry.title = REGISTRY_TITLE;
  delete registry.version;
  const item = {
    id: widgetID,
    name: manifest.name || name,
    title: manifest.title,
    version: widgetVersion,
    description: manifest.description || {},
    icon: releaseWidgetPath(name, widgetVersion, manifest.icon),
    manifest: releaseManifest,
    package: releasePackage,
    package_sha256: packageHash,
    requires,
    screenshots: manifest.screenshots || [],
    tags: manifest.tags || [],
    orientation: manifest.orientation || "auto",
  };
  const items = Array.isArray(registry.items) ? registry.items : [];
  const index = items.findIndex((existing) => existing.id === widgetID || existing.name === name);
  const previous = index >= 0 && items[index] && typeof items[index] === "object" ? items[index] : {};
  const releases = (Array.isArray(previous.releases) ? previous.releases : [])
    .map((entry) => normalizeRegistryRelease(entry))
    .filter((entry) => entry && releaseFileExists(entry.manifest));
  const release = {
    version: widgetVersion,
    manifest: releaseManifest,
    package: releasePackage,
    package_sha256: packageHash,
    requires,
    released_at: releases.find((entry) => entry && entry.version === widgetVersion)?.released_at || todayISODate(),
  };
  const nextReleases = [
    release,
    ...releases.filter((entry) => entry && entry.version !== widgetVersion),
  ];
  item.releases = nextReleases;
  if (index >= 0) items[index] = item;
  else items.push(item);
  registry.items = items.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  await writeJSON(registryPath, registry);
}

function normalizeRegistryRelease(entry) {
  if (!entry || typeof entry !== "object") return null;
  const version = typeof entry.version === "string" ? entry.version.trim() : "";
  if (!version) return null;
  return {
    version,
    manifest: entry.manifest,
    package: entry.package,
    package_sha256: entry.package_sha256,
    requires: entry.requires,
    released_at: entry.released_at,
  };
}

function releaseFileExists(rel) {
  if (typeof rel !== "string" || !rel.trim()) return false;
  const clean = rel.replace(/^\.\//, "");
  return fsSync.existsSync(path.join(ROOT, "widgets", clean));
}

async function packageWidget(name, options = {}) {
  const dir = path.join(ROOT, "widgets", name);
  const manifestPath = path.join(dir, "manifest.json");
  const manifest = await readJSON(manifestPath);
  const source = "./source/index.html";
  manifest.version = requireWidgetVersion(manifest);
  manifest.id = requireWidgetID(manifest);
  manifest.kind = WIDGET_MANIFEST_KIND;
  manifest.schema_version = WIDGET_SCHEMA_VERSION;
  manifest.requires = normalizedRequires(manifest);
  manifest.size = normalizedWidgetSize(manifest);
  const entryPath = path.posix.join("widgets", name, source.replace(/^\.\//, ""));
  const html = await buildRuntimeHTML(entryPath);
  const localizedTitle = typeof manifest.title === "object" && manifest.title ? manifest.title : undefined;
  const widgetPackage = {
    kind: PACKAGE_KIND,
    schema_version: PACKAGE_SCHEMA_VERSION,
    requires: manifest.requires,
    widget: {
      id: manifest.id,
      title: localizedTitle ? (localizedTitle["zh-CN"] || localizedTitle.en || manifest.name || name) : (manifest.title || manifest.name || name),
      version: manifest.version,
      size: manifest.size,
      orientation: manifest.orientation || "auto",
      html,
      initial_state: {},
    },
  };
  const packageIcon = await packageWidgetIcon(name);
  if (packageIcon) widgetPackage.widget.icon = packageIcon;
  const packageFilename = `${name}.pudding-widget.json`;
  if (localizedTitle) widgetPackage.widget.title = localizedTitle;
  const widgetVersion = manifest.version || "0.0.0";
  if (options.dev) {
    const devDir = path.join(dir, "dev");
    const devPackageFilename = `${name}.dev.pudding-widget.json`;
    const packagePath = path.join(devDir, devPackageFilename);
    const manifestPath = path.join(devDir, "manifest.json");
    const devID = `${manifest.id}-dev`;
    const devName = `${name}-dev`;
    const devVersion = `${widgetVersion}-dev`;
    const baseTitle = localizedTitle
      ? (localizedTitle["zh-CN"] || localizedTitle.en || Object.values(localizedTitle).find((value) => typeof value === "string" && value.trim()) || manifest.name || name)
      : (typeof widgetPackage.widget.title === "string" ? widgetPackage.widget.title : manifest.name || name);
    const devTitle = `${baseTitle} Dev`;
    const devLocalizedTitle = localizedTitle
      ? Object.fromEntries(Object.entries(localizedTitle).map(([locale, title]) => [locale, `${title} Dev`]))
      : undefined;
    widgetPackage.widget.id = devID;
    widgetPackage.widget.title = devTitle;
    widgetPackage.widget.version = devVersion;
    if (devLocalizedTitle) widgetPackage.widget.title = devLocalizedTitle;
    const packageText = JSON.stringify(widgetPackage, null, 2) + "\n";
    const packageHash = sha256Text(packageText);
    const devManifest = {
      kind: WIDGET_MANIFEST_KIND,
      schema_version: WIDGET_SCHEMA_VERSION,
      id: devID,
      name: devName,
      title: devLocalizedTitle || devTitle,
      version: devVersion,
      icon: manifest.icon ? `./${String(manifest.icon).replace(/^\.\//, "")}` : undefined,
      size: manifest.size,
      orientation: manifest.orientation || "auto",
      package: `./${devPackageFilename}`,
      package_sha256: packageHash,
      requires: manifest.requires,
    };
    await fs.mkdir(devDir, { recursive: true });
    await fs.writeFile(packagePath, packageText, "utf8");
    await writeJSON(manifestPath, devManifest);
    console.log(`packaged ${name} dev: ${packageHash}`);
    return;
  }
  const releaseDir = path.join(dir, "releases", widgetVersion);
  const packagePath = path.join(releaseDir, packageFilename);
  const packageText = JSON.stringify(widgetPackage, null, 2) + "\n";
  const packageHash = sha256Text(packageText);
  const releaseExists = fsSync.existsSync(releaseDir);
  const allowRepack = process.env.PUDDING_WIDGET_REPACK === "1";
  if (releaseExists) {
    if (!fsSync.existsSync(packagePath)) {
      throw new Error(`release ${name}@${widgetVersion} already exists without ${packageFilename}`);
    }
    const existingPackageText = await fs.readFile(packagePath, "utf8");
    const existingPackageHash = sha256Text(existingPackageText);
    if (existingPackageHash !== packageHash && !allowRepack) {
      throw new Error(`release ${name}@${widgetVersion} already exists with a different package hash; bump version before publishing`);
    }
    if (existingPackageHash !== packageHash && allowRepack) {
      await copyDirIfExists(path.join(dir, "assets"), path.join(releaseDir, "assets"));
      await copyDirIfExists(path.join(dir, "screenshots"), path.join(releaseDir, "screenshots"));
      await copyDirIfExists(path.join(dir, "source"), path.join(releaseDir, "source"));
      await fs.writeFile(packagePath, packageText, "utf8");
    }
  } else {
    await fs.mkdir(releaseDir, { recursive: true });
    await copyDirIfExists(path.join(dir, "assets"), path.join(releaseDir, "assets"));
    await copyDirIfExists(path.join(dir, "screenshots"), path.join(releaseDir, "screenshots"));
    await copyDirIfExists(path.join(dir, "source"), path.join(releaseDir, "source"));
    await fs.writeFile(packagePath, packageText, "utf8");
  }
  const rootManifest = buildRootManifest(manifest, `./releases/${widgetVersion}/${packageFilename}`, packageHash);
  await writeJSON(manifestPath, rootManifest);
  const releaseManifest = buildReleaseManifest(rootManifest, packageFilename, packageHash);
  await writeJSON(path.join(releaseDir, "manifest.json"), releaseManifest);
  await updateRegistry(name, rootManifest, packageHash);
  console.log(`packaged ${name}: ${packageHash}`);
}

async function widgetNamesFromRegistry() {
  const registry = await readJSON(path.join(ROOT, "widgets/registry.json"));
  return (registry.items || []).map((item) => item.name).filter(Boolean);
}

const args = parseArgs(process.argv.slice(2));
if (args.all && args.dev) {
  console.error("--dev can only package one widget at a time");
  process.exit(1);
}
const names = args.all ? await widgetNamesFromRegistry() : [args.name];
if (!names.length || !names[0]) {
  usage();
  process.exit(1);
}
for (const name of names) await packageWidget(name, { dev: args.dev });
