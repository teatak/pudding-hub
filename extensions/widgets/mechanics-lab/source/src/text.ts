/**
 * ============================================================================
 * 经典力学实验室 (Mechanics Lab) — 多语言国际化词典 (`src/text.ts`)
 * ============================================================================
 * 支持 8 种官方语言：en, zh-CN, zh-TW, ja, ko, es, de, fr。
 */

import extra from "./locales.json" with { type: "json" };

export const messages = extra;
export const DICTIONARY = extra;

export type Locale = keyof typeof messages;
export type LocaleKey = Locale;
export type MessageKey = keyof typeof messages.en;

export function normalizeLocale(raw?: string): Locale {
  const locale = (raw || "en").toLowerCase();
  if (/^zh-(tw|hk|mo|hant)(-|$)/.test(locale)) return "zh-TW";
  if (locale === "zh" || locale.startsWith("zh-") || locale.includes("hans")) return "zh-CN";
  const language = locale.split("-")[0];
  return ["ja", "ko", "es", "de", "fr"].includes(language)
    ? (language as Locale)
    : "en";
}

let current: Locale = "en";

export function setLocale(raw?: string): void {
  current = normalizeLocale(raw);
}

export function getLocale(): Locale {
  return current;
}

export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  const langDict = messages[current] || messages.en;
  const value =
    (langDict as Record<string, string>)[key] ||
    (messages.en as Record<string, string>)[key] ||
    key;

  return value.replace(/\{(\w+)\}/g, (token, name) =>
    params && Object.hasOwn(params, name) ? String(params[name]) : token,
  );
}

export function errorText(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (code in messages.en) return t(code as MessageKey);
  return error instanceof Error ? error.message : t("unknownError");
}

export function loc(
  map: Partial<Record<LocaleKey, string>> | undefined,
  locale: LocaleKey = current,
): string {
  if (!map) return "";
  return map[locale] ?? map.en ?? map["zh-CN"] ?? "";
}
