import { useState } from "react";
import { cn, countryFlag } from "@/lib/utils";

/**
 * circle-flags 圆形国旗,随主题一起打包(不走任何 CDN)。
 * 只收录两位国家码;?no-inline 让每面旗作为独立静态文件按需加载,
 * 打进主包的只有「国家码 → 文件地址」映射。
 */
const FLAG_URLS = import.meta.glob<string>("/node_modules/circle-flags/flags/[a-z][a-z].svg", {
  query: "?url&no-inline",
  import: "default",
  eager: true,
});

function flagUrl(code: string): string | undefined {
  return FLAG_URLS[`/node_modules/circle-flags/flags/${code.toLowerCase()}.svg`];
}

function useSvgFlag(): boolean {
  return window.ForceUseSvgFlag !== false;
}

/**
 * 国旗徽章:默认用本地打包的圆形 SVG 并包裹微高光内环,
 * 保证 macOS / Windows / 移动端观感一致;没有对应旗帜或加载失败时回退 emoji。
 */
export function Flag({ code, className }: { code: string; className?: string }) {
  const svg = useSvgFlag();
  const [failed, setFailed] = useState(false);
  const url = svg && code ? flagUrl(code) : undefined;

  if (url && !failed) {
    return (
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/15 shadow-2xs",
          className,
        )}
        style={{ width: "1.05em", height: "1.05em" }}
      >
        <img
          src={url}
          alt={code.toUpperCase()}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      </span>
    );
  }

  return (
    <span className={cn("leading-none", className)} aria-hidden>
      {countryFlag(code)}
    </span>
  );
}
