import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { sourceFiles } from "../scripts/package-widget.mjs";

const desktop = process.env.PUDDING_DESKTOP_DIR || fileURLToPath(new URL("../../pudding-desktop", import.meta.url));
const require = createRequire(path.join(desktop, "package.json"));
const { compileWithLegacySDK } = require(path.join(desktop, "electron/test/helpers/legacy-widget-build.cjs"));

test("Pocket Studio compiles against the frozen text-only SDK while direct binary calls remain rejected", async () => {
  const files = await sourceFiles(fileURLToPath(new URL("../widgets/pocket-studio/source", import.meta.url)));
  const request = { revisionHash: "a".repeat(64), files };
  const legacy = await compileWithLegacySDK(request);
  assert.equal(legacy.ok, true, JSON.stringify(legacy.diagnostics));
  const broken = structuredClone(request);
  broken.files["src/api.ts"] = broken.files["src/api.ts"].replace(
    "await pudding.exportFile(file)",
    'await pudding.exportFile({filename:"song.wav",content:"",encoding:"base64"})',
  );
  assert.notEqual(broken.files["src/api.ts"], files["src/api.ts"]);
  const rejected = await compileWithLegacySDK(broken);
  assert.equal(rejected.ok, false);
  assert.ok(rejected.diagnostics.some(error => /encoding.*does not exist/.test(error.message)));
});
