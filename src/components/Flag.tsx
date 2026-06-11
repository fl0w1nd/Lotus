import { useState } from "react";
import { cn, countryFlag } from "@/lib/utils";

/** Windows 不渲染国旗 emoji(只显示字母),自动改用 SVG */
const isWindows = /Win/i.test(navigator.platform || navigator.userAgent);

function useSvgFlag(): boolean {
  return Boolean(window.ForceUseSvgFlag) || isWindows;
}

/**
 * 国旗:默认 emoji(零请求);Windows 或 ForceUseSvgFlag 时
 * 使用 circle-flags SVG(CDN),加载失败回退 emoji。
 */
export function Flag({ code, className }: { code: string; className?: string }) {
  const svg = useSvgFlag();
  const [failed, setFailed] = useState(false);

  if (svg && code && !failed) {
    return (
      <img
        src={`https://cdn.jsdelivr.net/gh/HatScripts/circle-flags@gh-pages/flags/${code.toLowerCase()}.svg`}
        alt={code.toUpperCase()}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn("inline-block rounded-full", className)}
        style={{ width: "1em", height: "1em" }}
      />
    );
  }

  return (
    <span className={cn("leading-none", className)} aria-hidden>
      {countryFlag(code)}
    </span>
  );
}
