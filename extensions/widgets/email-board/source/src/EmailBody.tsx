import React, { useEffect, useMemo, useRef } from "react";

// Only this trusted bridge runs in the opaque-origin frame. Sender scripts and
// event handlers have already been removed, and CSP permits only this nonce.
const bridge = (id: string) => `(()=>{
  const send=value=>parent.postMessage({type:'pudding-email-body',id:${JSON.stringify(id)},...value},'*');
  let pending=0;
  const report=()=>{pending=0;const body=document.body,rect=body.getBoundingClientRect(),margin=parseFloat(getComputedStyle(body).marginBottom)||0;send({height:Math.max(body.scrollHeight,rect.height)+rect.top+margin})};
  const schedule=()=>{if(!pending)pending=requestAnimationFrame(report)};
  new ResizeObserver(schedule).observe(document.body);
  addEventListener('resize',schedule);document.addEventListener('load',schedule,true);
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');
    if(!link)return;event.preventDefault();
    if(event.isTrusted)send({href:link.getAttribute('href')});
  });
  schedule();
})()`;

export function EmailBody({ document, title }: { document: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const content = useMemo(() => {
    const id = Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16).padStart(8, "0")).join("");
    // srcdoc inherits the widget CSP, so use its compiler-generated nonce too.
    const nonce = window.document.querySelector<HTMLScriptElement>("script[nonce]")!.nonce;
    const parsed = new DOMParser().parseFromString(document, "text/html");
    const policy = parsed.querySelector<HTMLMetaElement>('meta[http-equiv="Content-Security-Policy"]')!;
    policy.content = policy.content.replace("script-src 'none'", `script-src 'nonce-${nonce}'`);
    // Serialize the trusted nonce explicitly: DOM nonce hiding clears the
    // reflected attribute when an element is attached to a CSP document.
    const trusted = `<script nonce="${nonce}">${bridge(id)}</script>`;
    const html = parsed.documentElement.outerHTML.replace("</body>", trusted + "</body>");
    return { id, html: "<!doctype html>" + html };
  }, [document]);
  useEffect(() => {
    const element = frame.current!;
    element.style.height = "1px";
    const receive = (event: MessageEvent) => {
      if (event.source !== element.contentWindow || event.data?.type !== "pudding-email-body" || event.data.id !== content.id) return;
      const { height, href } = event.data;
      if (typeof height === "number" && Number.isFinite(height)) {
        element.style.height = `${Math.max(1, Math.min(Math.ceil(height), 30000))}px`;
      }
      if (typeof href === "string" && /^(https?:\/\/|mailto:)/i.test(href)) {
        // The widget guest intercepts and cancels navigation, opening safe
        // external URLs through the host. No popup sandbox permission is needed.
        window.location.assign(href);
      }
    };
    window.addEventListener("message", receive);
    let width = element.clientWidth;
    const container = new ResizeObserver(() => {
      if (element.clientWidth !== width) { width = element.clientWidth; element.style.height = "1px"; }
    });
    container.observe(element);
    return () => { window.removeEventListener("message", receive); container.disconnect(); };
  }, [content]);
  return <iframe ref={frame} className="gb-email-frame" title={title} sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={content.html} />;
}
