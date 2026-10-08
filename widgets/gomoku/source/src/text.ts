export const zh = navigator.language.startsWith("zh");
export const text = (en: string, cn: string) => (zh ? cn : en);
