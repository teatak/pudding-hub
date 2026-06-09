import { t, isHuman } from "../utils.js";

export function getGeminiSVG() {
  return '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M12 2C12 2 12.5 8.5 14 10C15.5 11.5 22 12 22 12C22 12 15.5 12.5 14 14C12.5 15.5 12 22 12 22C12 22 11.5 15.5 10 14C8.5 12.5 2 12 2 12C2 12 8.5 11.5 10 10C11.5 8.5 12 2 12 2Z" fill="url(#gemini-grad)" />' +
    '<defs><linearGradient id="gemini-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">' +
    '<stop offset="0%" stop-color="#38bdf8" /><stop offset="50%" stop-color="#818cf8" /><stop offset="100%" stop-color="#c084fc" />' +
    '</linearGradient></defs></svg>';
}

export function getGPTSVG() {
  return '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="color: #10a37f;">' +
    '<path d="M21.7 11.2c0-.4-.1-.8-.3-1.1-.3-.6-.7-1-1.3-1.2l.2-1.3c.1-.4 0-.8-.2-1.2-.3-.6-.8-.9-1.4-1l-.5-1.2c-.2-.4-.5-.7-.9-.8-.7-.2-1.3 0-1.7.5l-1.1-.7c-.4-.2-.8-.3-1.2-.2-.7.1-1.2.6-1.5 1.2l-1.2-.5c-.4-.1-.8-.1-1.2.1-.6.3-1 .8-1.1 1.4l-1.3-.2c-.4-.1-.8 0-1.2.2-.6.3-.9.8-1 1.4L4.8 7c-.2.4-.3.8-.2 1.2 0 .7.4 1.2 1 1.5l-.5 1.2c-.1.4-.1.8.1 1.2.3.6.8 1 1.4 1.1l.2 1.3c.1.4.3.7.6.9.5.4 1.2.4 1.7.2l.7 1.1c.2.4.6.6 1 .7.7.2 1.3-.1 1.7-.6l1.2.5c.4.2.8.2 1.2.1.6-.2 1.1-.7 1.3-1.3l1.2.5c.4.1.8.1 1.2-.1.6-.3.9-.8 1-1.4l1.3.2c.4.1.8 0 1.2-.2.6-.3.9-.8 1-1.4l1.2.5c.2.1.5.1.8 0 .3-.1.5-.3.6-.5.4-.5.4-1.2.1-1.7zm-9.7 4.1l-2.4-1.4 2.4-1.4 2.4 1.4-2.4 1.4z" />' +
    '</svg>';
}

export function getClaudeSVG() {
  return '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #d97706;" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M12 3v18M12 12h9M12 12H3" />' +
    '<circle cx="12" cy="12" r="7" stroke-dasharray="2 2" />' +
    '</svg>';
}

export function getDeepSeekSVG() {
  return '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="24" height="24" rx="5" fill="#4D6BFE" />' +
    '<g transform="translate(4.8 4.8) scale(0.6)">' +
    '<path d="M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136 9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287.3.3 0 0 1 .113.074.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078.253.253 0 0 1-.114-.358 1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45" fill="#ffffff" />' +
    '</g></svg>';
}

export function getQwenSVG() {
  return '<svg viewBox="0 0 24 24" width="26" height="26" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="24" height="24" rx="5" fill="#615CED" />' +
    '<g transform="translate(4.8 4.8) scale(0.6)">' +
    '<path d="M23.919 14.545 20.817 9.17l1.47-2.544a.56.56 0 0 0 0-.566l-1.633-2.83a.57.57 0 0 0-.49-.283h-6.207L12.487.402a.57.57 0 0 0-.49-.284H8.732a.56.56 0 0 0-.49.284L5.139 5.775h-2.94a.56.56 0 0 0-.49.284L.077 8.887a.56.56 0 0 0 0 .567L3.18 14.83l-1.47 2.545a.56.56 0 0 0 0 .566l1.634 2.83a.57.57 0 0 0 .49.283h6.205l1.47 2.545a.57.57 0 0 0 .49.284h3.266a.57.57 0 0 0 .49-.284l3.104-5.375h2.94a.57.57 0 0 0 .49-.283l1.634-2.828a.55.55 0 0 0-.004-.568M8.733.686l1.634 2.828-1.634 2.828H21.8L20.164 9.17H7.425L5.63 6.06Zm1.306 19.801-6.205-.002 1.634-2.83h3.265L2.201 6.344h3.267q3.182 5.517 6.367 11.032zm10.124-5.66L18.53 12l-6.532 11.315-1.634-2.83c2.129-3.673 4.25-7.351 6.373-11.028h3.592l3.102 5.374z" fill="#ffffff" />' +
    '</g></svg>';
}

export function getZhipuSVG() {
  return '<svg viewBox="0 0 24 24" width="26" height="26" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="24" height="24" rx="5" fill="#3859FF" />' +
    '<text x="12" y="17.5" text-anchor="middle" font-family="system-ui, -apple-system, \'PingFang SC\', \'Microsoft YaHei\', sans-serif" font-size="14" font-weight="700" fill="#ffffff">智</text>' +
    '</svg>';
}

export function getKimiSVG() {
  return '<svg viewBox="0 0 24 24" width="26" height="26" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="24" height="24" rx="5" fill="#1A237E" />' +
    '<text x="12" y="17" text-anchor="middle" font-family="system-ui, -apple-system, \'Helvetica Neue\', sans-serif" font-size="13" font-weight="700" fill="#ffffff">K</text>' +
    '</svg>';
}

export function getGrokSVG() {
  return '<svg viewBox="0 0 24 24" width="26" height="26" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="24" height="24" rx="5" fill="#000000" />' +
    '<g transform="translate(4.8 4.8) scale(0.6)">' +
    '<path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" fill="#ffffff" />' +
    '</g></svg>';
}

export function getMimoSVG() {
  return '<svg viewBox="0 0 24 24" width="26" height="26" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="24" height="24" rx="5" fill="#FF6900" />' +
    '<text x="12" y="17" text-anchor="middle" font-family="system-ui, -apple-system, \'Helvetica Neue\', sans-serif" font-size="13" font-weight="700" fill="#ffffff">Mi</text>' +
    '</svg>';
}

export function getHumanSVG() {
  return '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />' +
    '<circle cx="12" cy="7" r="4" />' +
    '</svg>';
}

export function getRobotSVG(session_id) {
  let hash = 0;
  if (session_id) {
    for (let i = 0; i < session_id.length; i++) {
      hash = session_id.charCodeAt(i) + ((hash << 5) - hash);
    }
  }
  const hue = Math.abs(hash % 360);
  const color = "hsl(" + hue + ", 75%, 65%)";

  return '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="3" y="11" width="18" height="10" rx="2" />' +
    '<path d="M12 2v4M8 5h8M7 11V9a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2M9 15h.01M15 15h.01" />' +
    '</svg>';
}

export function renderAvatar(session_id, title) {
  const tVal = (title || "").toLowerCase();
  if (isHuman(session_id)) return getHumanSVG();
  if (tVal.indexOf("gemini") !== -1) return getGeminiSVG();
  if (tVal.indexOf("gpt") !== -1 || tVal.indexOf("openai") !== -1 || tVal.indexOf("chatgpt") !== -1) return getGPTSVG();
  if (tVal.indexOf("claude") !== -1 || tVal.indexOf("anthropic") !== -1) return getClaudeSVG();
  if (tVal.indexOf("deepseek") !== -1) return getDeepSeekSVG();
  if (tVal.indexOf("qwen") !== -1 || tVal.indexOf("tongyi") !== -1) return getQwenSVG();
  if (tVal.indexOf("glm") !== -1 || tVal.indexOf("zhipu") !== -1) return getZhipuSVG();
  if (tVal.indexOf("kimi") !== -1 || tVal.indexOf("moonshot") !== -1) return getKimiSVG();
  if (tVal.indexOf("grok") !== -1 || tVal.indexOf("xai") !== -1) return getGrokSVG();
  if (tVal.indexOf("mimo") !== -1 || tVal.indexOf("xiaomi") !== -1) return getMimoSVG();
  return getRobotSVG(session_id);
}
