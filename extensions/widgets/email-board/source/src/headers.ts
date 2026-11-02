export function decodeHeaderWords(value: string): string {
  const words = /=\?([^?\s]+)\?([bq])\?([^?]*)\?=/gi;
  let result = "", end = 0, previousDecoded = false;
  for (const match of value.matchAll(words)) {
    let decoded: string;
    try {
      const payload = match[3];
      let bytes: Uint8Array;
      if (match[2].toLowerCase() === "b") {
        bytes = Uint8Array.from(atob(payload), char => char.charCodeAt(0));
      } else {
        if (/=(?![0-9a-f]{2})/i.test(payload) || /[^\x20-\x7e]/.test(payload)) throw new Error("Invalid encoded word");
        const text = payload.replace(/_/g, " ").replace(/=([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
        bytes = Uint8Array.from(text, char => char.charCodeAt(0));
      }
      decoded = new TextDecoder(match[1].split("*")[0], { fatal: true }).decode(bytes);
    } catch {
      result += value.slice(end, match.index) + match[0];
      end = match.index + match[0].length;
      previousDecoded = false;
      continue;
    }
    const between = value.slice(end, match.index);
    if (!previousDecoded || !/^\s*$/.test(between)) result += between;
    result += decoded;
    end = match.index + match[0].length;
    previousDecoded = true;
  }
  return result + value.slice(end);
}

export function parseSender(raw: string) {
  const trimmed = raw.trim(), match = trimmed.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    const email = match[2].trim();
    const name = decodeHeaderWords(match[1].trim().replace(/^["']|["']$/g, "")).trim() || email.split("@")[0] || email;
    return { name, email, full: `${name} <${email}>` };
  }
  const full = decodeHeaderWords(trimmed);
  return { name: full.split("@")[0] || full, email: trimmed.includes("@") ? trimmed : "", full };
}
