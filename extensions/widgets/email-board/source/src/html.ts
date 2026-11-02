import DOMPurify from "dompurify";

// Render this complete document only inside EmailBody's opaque-origin sandbox.
// Email styles and images must not share the widget's document or CSS.
export function sanitizeEmailHtml(html: string): string {
  if (!html.trim()) return "";
  const root = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    RETURN_DOM: true,
    USE_PROFILES: { html: true },
    ADD_TAGS: ["style"],
    FORBID_TAGS: ["script", "iframe", "frame", "frameset", "object", "embed", "form", "input", "button", "select", "textarea", "base", "link", "meta", "audio", "video", "source", "track", "template"],
    FORBID_ATTR: ["srcdoc", "srcset", "ping", "action", "formaction", "autofocus", "contenteditable", "nonce"],
    ALLOW_DATA_ATTR: false,
  }) as HTMLElement;
  const document = root.ownerDocument;
  const head = root.querySelector("head")!;
  const charset = document.createElement("meta");
  charset.setAttribute("charset", "utf-8");
  const policy = document.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'";
  const referrer = document.createElement("meta");
  referrer.name = "referrer";
  referrer.content = "no-referrer";
  const defaults = document.createElement("style");
  defaults.textContent = "html{color-scheme:light;background:#fff}body{margin:0;color:#202124;font:14px/1.5 Arial,Helvetica,sans-serif;overflow-wrap:break-word}img{max-width:100%;height:auto}";
  head.prepend(charset, policy, referrer, defaults);
  for (const link of root.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href")!.trim().replace(/^\/\//, "https://");
    if (/^(https?:\/\/|mailto:)/i.test(href)) link.setAttribute("href", href);
    else link.removeAttribute("href");
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  }
  for (const image of root.querySelectorAll("img")) {
    const src = (image.getAttribute("src") ?? "").trim().replace(/^\/\//, "https://");
    if (/^https:\/\//i.test(src) || /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(src)) image.setAttribute("src", src);
    else image.removeAttribute("src");
    image.setAttribute("referrerpolicy", "no-referrer");
    image.setAttribute("loading", "lazy");
    image.setAttribute("decoding", "async");
  }
  return "<!doctype html>" + root.outerHTML;
}
