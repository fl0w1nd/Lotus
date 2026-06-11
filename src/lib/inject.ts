/** 将管理后台「自定义代码」注入 DOM(脚本按顺序执行,可重复调用) */

export const CUSTOM_CODE_EVENT = "lotus:custom-code-injected";
const MARK = "data-lotus-injected";

function runScript(el: HTMLScriptElement): Promise<void> {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.setAttribute(MARK, "");
    if (el.src) {
      script.src = el.src;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => {
        console.warn(`[lotus] failed to load custom script: ${el.src}`);
        resolve();
      };
    } else {
      script.textContent = el.textContent ?? "";
    }
    document.body.appendChild(script);
    if (!el.src) resolve();
  });
}

function addNode(el: HTMLElement): Promise<void> {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.setAttribute(MARK, "");
  const target =
    el.tagName === "STYLE" || el.tagName === "LINK" || el.tagName === "META"
      ? document.head
      : document.body;
  target.appendChild(clone);
  if (el.tagName === "LINK") {
    return new Promise((resolve) => {
      clone.onload = () => resolve();
      clone.onerror = () => resolve();
    });
  }
  return Promise.resolve();
}

let injected = "";

export async function injectCustomCode(html: string): Promise<void> {
  if (!html || html === injected) return;
  injected = html;

  // 清理上一次注入
  for (const n of document.querySelectorAll(`[${MARK}]`)) {
    n.remove();
  }

  const tpl = document.createElement("template");
  tpl.innerHTML = html;

  for (const node of Array.from(tpl.content.childNodes)) {
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as HTMLElement;
    if (el.tagName === "SCRIPT") {
      await runScript(el as HTMLScriptElement);
    } else {
      await addNode(el);
    }
  }

  window.dispatchEvent(new Event(CUSTOM_CODE_EVENT));
}
