import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { packageWidget } from "../scripts/package-widget.mjs";

test("new formal and dev packages leave the retired widgets tree unchanged", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "pudding-package-paths-"));
  try {
    const dir = path.join(root, "extensions/widgets/example");
    await fs.mkdir(path.join(dir, "source/src"), { recursive: true });
    await fs.mkdir(path.join(root, "widgets"));
    await fs.writeFile(path.join(root, "widgets/registry.json"), "frozen\n");
    await fs.writeFile(path.join(dir, "manifest.json"), JSON.stringify({
      id: "test/pudding-hub/widgets/example", version: "1.0.0", title: { en: "Example" },
      description: { en: "Packaging fixture" }, requires: { protocolVersion: 55, sdkVersion: "1.2.0" },
    }));
    await fs.writeFile(path.join(dir, "source/widget.json"), JSON.stringify({
      schemaVersion: 1, sdkVersion: "1.2.0", entry: "src/App.tsx", sources: {}, operations: {},
    }));
    await fs.writeFile(path.join(dir, "source/src/App.tsx"), "export default function App(){return <p>Fixture</p>}");
    await packageWidget("example", { root });
    await packageWidget("example", { root, dev: true });
    await fs.access(path.join(dir, "releases/1.0.0/example.pudding-widget.json"));
    await fs.access(path.join(dir, "dev/example.pudding-widget.json"));
    assert.deepEqual(await fs.readdir(path.join(root, "widgets")), ["registry.json"]);
    assert.equal(await fs.readFile(path.join(root, "widgets/registry.json"), "utf8"), "frozen\n");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
