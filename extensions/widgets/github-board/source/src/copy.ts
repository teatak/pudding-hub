// The widget guest does not grant the asynchronous Clipboard permission.
// Copy only in a user gesture, using the browser's standard selection command.
export function copyText(text: string, root: HTMLElement): boolean {
  const doc = root.ownerDocument;
  const previous = doc.activeElement;
  const input = doc.createElement("textarea");
  input.value = text;
  input.readOnly = true;
  input.style.cssText =
    "position:fixed;opacity:0;inset:0 auto auto 0;width:1px;height:1px";
  root.append(input);
  try {
    input.focus({ preventScroll: true });
    input.select();
    return doc.execCommand("copy");
  } catch {
    return false;
  } finally {
    input.remove();
    if (previous instanceof HTMLElement)
      previous.focus({ preventScroll: true });
  }
}
