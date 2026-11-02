import DOMPurify from "dompurify";

// Preserve email typography and table layouts without active content, remote
// resources, page-wide styles or positioning outside the message body.
const styles = new Set([
  "color", "background-color", "font-family", "font-size", "font-style",
  "font-weight", "font-variant", "line-height", "letter-spacing", "word-spacing",
  "text-align", "text-decoration", "text-indent", "text-transform", "white-space",
  "word-break", "overflow-wrap", "vertical-align", "display", "width", "max-width",
  "min-width", "height", "max-height", "min-height", "border", "border-color",
  "border-style", "border-width", "border-radius", "border-collapse", "border-spacing",
  "border-top", "border-right", "border-bottom", "border-left", "margin", "margin-top",
  "margin-right", "margin-bottom", "margin-left", "padding", "padding-top",
  "padding-right", "padding-bottom", "padding-left", "list-style-type",
]);

export function sanitizeEmailHtml(html: string): string {
  const fragment = DOMPurify.sanitize(html, {
    RETURN_DOM_FRAGMENT: true,
    ALLOWED_TAGS: [
      "a", "abbr", "b", "blockquote", "br", "caption", "center", "code", "col",
      "colgroup", "dd", "del", "div", "dl", "dt", "em", "font", "h1", "h2", "h3",
      "h4", "h5", "h6", "hr", "i", "li", "ol", "p", "pre", "s", "small", "span",
      "strong", "sub", "sup", "table", "tbody", "td", "tfoot", "th", "thead", "tr",
      "u", "ul",
    ],
    ALLOWED_ATTR: [
      "href", "title", "lang", "dir", "style", "align", "valign", "width", "height",
      "colspan", "rowspan", "cellpadding", "cellspacing", "border", "color", "bgcolor",
      "face", "size", "start", "type",
    ],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:https?:\/\/|mailto:)/i,
  });
  for (const element of fragment.querySelectorAll<HTMLElement>("[style]")) {
    const clean = fragment.ownerDocument.createElement("span").style;
    for (const property of Array.from(element.style)) {
      const value = element.style.getPropertyValue(property);
      if (styles.has(property) && !/(?:url|image-set|expression|var|attr)\s*\(|[\\@]/i.test(value)) {
        clean.setProperty(property, value);
      }
    }
    if (clean.cssText) element.setAttribute("style", clean.cssText);
    else element.removeAttribute("style");
  }
  for (const link of fragment.querySelectorAll("a[href]")) {
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  }
  const container = fragment.ownerDocument.createElement("div");
  container.append(fragment);
  return container.innerHTML;
}
