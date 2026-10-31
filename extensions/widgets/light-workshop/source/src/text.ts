import extra from './locales.json' with { type: 'json' };
export const messages = extra;
export type Locale = keyof typeof messages;
export type MessageKey = keyof typeof messages.en;
export function normalizeLocale(raw?: string): Locale {
  const locale = (raw || 'en').toLowerCase();
  if (/^zh-(tw|hk|mo|hant)(-|$)/.test(locale)) return 'zh-TW';
  if (locale === 'zh' || locale.startsWith('zh-')) return 'zh-CN';
  const language = locale.split('-')[0];
  return ['ja','ko','es','de','fr'].includes(language) ? language as Locale : 'en';
}
let current: Locale = 'en';
export function setLocale(raw?: string) { current = normalizeLocale(raw); }
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const value = messages[current][key] || messages.en[key];
  return value.replace(/\{(\w+)\}/g, (token, name) => params && Object.hasOwn(params, name) ? String(params[name]) : token);
}
export function errorText(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code in messages.en) return t(code as MessageKey);
  return error instanceof Error ? error.message : t('unknownError');
}
