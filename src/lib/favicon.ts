import { useEffect } from "react";
import { isServerOnline } from "./utils";
import { useNezhaWS } from "./ws";

const LOTUS_PATH = `<path d="M12 3.5c1.9 2.2 2.9 4.6 2.9 7.1 0 3-1.3 5.4-2.9 6.9-1.6-1.5-2.9-3.9-2.9-6.9 0-2.5 1-4.9 2.9-7.1Z" fill="{C}" opacity=".95"/><path d="M4.5 8.5c2.8.5 5 1.8 6.4 3.8 1.5 2.1 1.9 4.5 1.5 6.6-2.1-.3-4.4-1.5-5.9-3.6-1.4-2-1.9-4.4-2-6.8Z" fill="{C}" opacity=".55"/><path d="M19.5 8.5c-.1 2.4-.6 4.8-2 6.8-1.5 2.1-3.8 3.3-5.9 3.6-.4-2.1 0-4.5 1.5-6.6 1.4-2 3.6-3.3 6.4-3.8Z" fill="{C}" opacity=".55"/>`;

function faviconUrl(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${LOTUS_PATH.replaceAll("{C}", color)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** favicon 随整体健康状态变色:正常=品牌紫 / 有离线=琥珀 / 半数以上离线=红 */
export function useHealthFavicon() {
  const { snapshot } = useNezhaWS();

  useEffect(() => {
    if (!snapshot?.servers?.length) return;
    const total = snapshot.servers.length;
    const online = snapshot.servers.filter((s) => isServerOnline(snapshot.now, s)).length;

    const color =
      online === total
        ? "#a78bfa" // 品牌紫,一切正常
        : online >= total / 2
          ? "#e7b75f" // 有节点离线
          : "#e5484d"; // 大面积故障

    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.href = faviconUrl(color);
  }, [snapshot]);
}
