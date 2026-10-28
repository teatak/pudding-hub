import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
const url =
  "data:text/javascript," +
  encodeURIComponent(
    `let locale='en';export const setLocale=v=>locale=v;export const pudding={locale:{read:()=>locale}};`,
  );
const hook = registerHooks({
  resolve(specifier, context, next) {
    return specifier === "@pudding/widget"
      ? { url, shortCircuit: true }
      : next(specifier, context);
  },
});
const { messages, t, errorText } =
  await import("../extensions/widgets/shared-todo/source/src/text.ts");
const { setLocale } = await import(url);
hook.deregister();
test("Todo translations have matching keys/placeholders and follow the current host locale", () => {
  const params = (value) =>
    [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const locale of ["en", "zh-CN", "zh-TW"]) {
    setLocale(locale);
    assert.deepEqual(
      Object.keys(messages[locale]).sort(),
      Object.keys(messages.en).sort(),
    );
    for (const key of Object.keys(messages.en)) {
      assert.ok(messages[locale][key].trim());
      assert.deepEqual(params(messages[locale][key]), params(messages.en[key]));
    }
    const title = "$& $$ {count} 🎯";
    assert.ok(t("edit", { title }).includes(title));
    assert.equal(
      errorText(new Error("Task no longer exists")),
      messages[locale].missing,
    );
    assert.equal(
      errorText(new Error("Unrecognized saved data")),
      messages[locale].invalidData,
    );
    assert.equal(t("title"), messages[locale].title);
    assert.equal(
      errorText(new Error("widget_data_conflict")),
      messages[locale].conflict,
    );
  }
});
