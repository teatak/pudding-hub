import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Only the host locale is substituted; exercise the shipped translation code.
const sdkURL = "data:text/javascript," + encodeURIComponent(`
  let locale = 'en';
  export const setLocale = value => { locale = value; };
  export const pudding = { locale: { read: () => locale } };
`);
const hook = registerHooks({
  resolve(specifier, context, next) {
    return specifier === "@pudding/widget"
      ? { url: sdkURL, shortCircuit: true }
      : next(specifier, context);
  },
});
const { messages, t, errorText } = await import("../widgets/gomoku/source/src/text.ts");
const { setLocale } = await import(sdkURL);
hook.deregister();

test("all game locales have matching keys and interpolation parameters", () => {
  const keys = Object.keys(messages.en).sort();
  const parameters = value => [...value.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
  for (const dictionary of Object.values(messages)) {
    assert.deepEqual(Object.keys(dictionary).sort(), keys);
    for (const key of keys) {
      assert.ok(dictionary[key].trim(), key);
      assert.deepEqual(parameters(dictionary[key]), parameters(messages.en[key]), key);
    }
  }
});

test("notification interpolation preserves dollars, braces and Unicode in names", () => {
  const name = "棋手 $& $$ $` $' {result} 🎮";
  for (const [locale, expected] of [
    ["en", `Match finished: ${name} wins`],
    ["zh-CN", `本局结束，${name}获胜`],
    ["zh-TW", `本局結束，${name}獲勝`],
  ]) {
    setLocale(locale);
    const summary = t("notifyMatchFinished", { name });
    assert.equal(summary, expected);
    assert.ok(t("notifyResultSummary", { result: summary }).startsWith(expected));
    assert.ok(t("roundDetail", { round: "{detail}", detail: "unchanged" }).includes("{detail}"),
      "inserted values must not be interpolated a second time");
  }
});

test("draw messages use the localized result summary", () => {
  for (const [locale, expected] of [["en", "Match drawn"], ["zh-CN", "本局平局"], ["zh-TW", "本局和局"]]) {
    setLocale(locale);
    assert.ok(t("notifyResultSummary", { result: t("notifyMatchDrawn") }).startsWith(expected));
  }
});

test("move totals read correctly for one or multiple moves", () => {
  for (const count of [1, 2, 225]) {
    for (const locale of ["en", "zh-CN", "zh-TW"]) {
      setLocale(locale);
      assert.equal(t("movesCount", { count }), locale === "en" ? `Moves: ${count}` : `${count} 手`);
    }
  }
});

test("retained errors translate from the original error on each locale change", () => {
  const error = new Error("Game is paused");
  for (const [locale, expected] of [
    ["zh-CN", "对局已暂停，请先继续对局"],
    ["zh-TW", "對局已暫停，請先繼續對局"],
    ["en", "Game is paused"],
    ["zh-CN", "对局已暂停，请先继续对局"],
  ]) {
    setLocale(locale);
    assert.equal(errorText(error), expected);
    assert.equal(error.message, "Game is paused");
  }
  assert.equal(errorText(new Error("Network unavailable")), "Network unavailable");
});


test("assigned-color invitations give only the ready action in all locales", () => {
  for (const locale of ["en", "zh-CN", "zh-TW"]) {
    setLocale(locale);
    for (const key of ["stoneBlack", "stoneWhite"]) {
      const color=t(key);
      assert.ok(t("notifyInviteSummary", {color}).includes(color));
      const message=t("notifyInviteMessage", {color});
      assert.ok(message.includes(color));
      assert.match(message, /widget_invoke\(.*name:"ready"/);
      assert.match(message, /3/);
      assert.doesNotMatch(message, /joinSeat|leaveSeat/);
    }
  }
});
