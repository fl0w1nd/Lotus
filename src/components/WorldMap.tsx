import { useMemo, useState } from "react";
import worldDots from "@/assets/world-dots.json";
import { useI18n } from "@/lib/i18n";
import { cn, isServerOnline } from "@/lib/utils";
import { useNezhaWS } from "@/lib/ws";

const DOT_R = 0.32;

interface CountryAgg {
  code: string;
  x: number;
  y: number;
  online: number;
  total: number;
}

/** 世界点阵地图:构建期生成的陆地点阵 + 服务器所在国家脉冲点 */
export function WorldMap() {
  const { snapshot } = useNezhaWS();
  const { t } = useI18n();
  const [open, setOpen] = useState<boolean>(() => {
    if (window.ForceShowMap) return true;
    const saved = localStorage.getItem("lotus-map");
    return saved === null ? true : saved === "1";
  });

  // 陆地底图:全部点合并为单条 path,只占一个 DOM 节点
  const basePath = useMemo(() => {
    const r = DOT_R;
    return (worldDots.dots as number[][])
      .map(([x, y]) => `M${x} ${y}m${-r},0a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${-r * 2},0`)
      .join("");
  }, []);

  const countries = useMemo<CountryAgg[]>(() => {
    if (!snapshot?.servers) return [];
    const table = worldDots.countries as Record<string, number[]>;
    const agg = new Map<string, CountryAgg>();
    for (const s of snapshot.servers) {
      const code = (s.country_code || "").toUpperCase();
      const pos = table[code];
      if (!pos) continue;
      const cur = agg.get(code) ?? {
        code,
        x: pos[0],
        y: pos[1],
        online: 0,
        total: 0,
      };
      cur.total += 1;
      if (isServerOnline(snapshot.now, s)) cur.online += 1;
      agg.set(code, cur);
    }
    return [...agg.values()];
  }, [snapshot]);

  const toggle = () => {
    setOpen((v) => {
      localStorage.setItem("lotus-map", v ? "0" : "1");
      return !v;
    });
  };

  if (!snapshot?.servers?.length) return null;

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-faint">
            {t("map")}
          </span>
          <span className="font-mono text-[10px] text-faint">
            {countries.length} {t("regions")}
          </span>
        </span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={cn(
            "size-3 text-faint transition-transform duration-300",
            open && "rotate-180",
          )}
        >
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <svg
            viewBox={`0 6 ${worldDots.w} ${worldDots.h - 14}`}
            className="block w-full px-2 pb-2"
            role="img"
            aria-label={t("map")}
          >
            <path d={basePath} className="fill-fg opacity-[0.13]" />
            {countries.map((c) => {
              const ok = c.online > 0;
              const color = ok ? "var(--color-up)" : "var(--color-down)";
              return (
                <g key={c.code}>
                  <title>{`${c.code} · ${c.online}/${c.total}`}</title>
                  {ok && (
                    <circle cx={c.x} cy={c.y} r={0.9} fill={color} opacity={0.5}>
                      <animate
                        attributeName="r"
                        values="0.9;2.6"
                        dur="2.4s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.5;0"
                        dur="2.4s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                  <circle cx={c.x} cy={c.y} r={0.75} fill={color} />
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
