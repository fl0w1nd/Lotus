import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { LotusMark } from "@/components/Logo";
import { ServerCard } from "@/components/ServerCard";
import { ServerRow } from "@/components/ServerRow";
import { StatsBar } from "@/components/StatsBar";
import { fetchServerGroups } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn, isServerOnline, memPercent } from "@/lib/utils";
import { useNezhaWS } from "@/lib/ws";

type SortKey = "default" | "cpu" | "mem" | "traffic" | "uptime";

export default function Home() {
  const { snapshot } = useNezhaWS();
  const { t } = useI18n();
  const [groupId, setGroupId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("default");
  const [viewMode, setViewMode] = useState<"card" | "list">(() => {
    return (localStorage.getItem("lotus-view-mode") as "card" | "list") || "card";
  });

  const toggleViewMode = (mode: "card" | "list") => {
    setViewMode(mode);
    localStorage.setItem("lotus-view-mode", mode);
  };
  // 打字过滤走低优先级更新,避免输入卡顿
  const deferredQuery = useDeferredValue(query);

  // 仅首屏数据到达后的第一次渲染播放入场动画,过滤/排序不再触发
  const introDone = useRef(false);
  useEffect(() => {
    if (snapshot && !introDone.current) {
      const id = requestAnimationFrame(() => {
        introDone.current = true;
      });
      return () => cancelAnimationFrame(id);
    }
  }, [snapshot]);

  const { data: groupsData } = useQuery({
    queryKey: ["server-group"],
    queryFn: fetchServerGroups,
  });

  const groups = groupsData?.data ?? [];
  const servers = snapshot?.servers ?? [];
  const now = snapshot?.now ?? Date.now();

  const filtered = useMemo(() => {
    let list = servers;
    if (groupId !== null) {
      const g = groups.find((g) => g.group.id === groupId);
      const ids = new Set(g?.servers ?? []);
      list = list.filter((s) => ids.has(s.id));
    }
    if (deferredQuery.trim()) {
      const q = deferredQuery.trim().toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    const arr = [...list];
    switch (sort) {
      case "cpu":
        arr.sort((a, b) => b.state.cpu - a.state.cpu);
        break;
      case "mem":
        arr.sort((a, b) => memPercent(b) - memPercent(a));
        break;
      case "traffic":
        arr.sort(
          (a, b) =>
            b.state.net_in_transfer +
            b.state.net_out_transfer -
            (a.state.net_in_transfer + a.state.net_out_transfer),
        );
        break;
      case "uptime":
        arr.sort((a, b) => b.state.uptime - a.state.uptime);
        break;
      default:
        // 在线优先,其余保持面板顺序
        arr.sort((a, b) => Number(isServerOnline(now, b)) - Number(isServerOnline(now, a)));
    }
    return arr;
  }, [servers, groups, groupId, deferredQuery, sort, now]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "default", label: t("sortDefault") },
    { key: "cpu", label: t("sortCpu") },
    { key: "mem", label: t("sortMem") },
    { key: "traffic", label: t("sortTraffic") },
    { key: "uptime", label: t("sortUptime") },
  ];

  return (
    <div className="flex flex-col gap-4 pt-5">
      <StatsBar />

      {/* 工具栏:分组(可横滑) + 搜索 + 排序 + 视图切换 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="no-scrollbar -mx-4 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <GroupPill
            active={groupId === null}
            onClick={() => setGroupId(null)}
            label={t("all")}
            count={servers.length}
          />
          {groups.map((g) => (
            <GroupPill
              key={g.group.id}
              active={groupId === g.group.id}
              onClick={() => setGroupId(g.group.id)}
              label={g.group.name}
              count={g.servers?.length ?? 0}
            />
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint"
            >
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="m10.5 10.5 3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-8 w-full rounded-lg border border-line bg-surface pl-8 pr-3 text-xs text-fg outline-none transition-colors placeholder:text-faint focus:border-line-strong sm:w-52"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-8 shrink-0 cursor-pointer appearance-none rounded-lg border border-line bg-surface px-3 pr-7 text-xs text-fg-2 outline-none transition-colors focus:border-line-strong"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath fill='%23888' d='M4.5 6l3.5 4 3.5-4z'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 8px center",
            }}
          >
            {sortOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>

          {/* 视图模式切换 */}
          <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => toggleViewMode("card")}
              className={cn(
                "p-1 rounded-md transition-all",
                viewMode === "card"
                  ? "bg-surface-2 text-fg shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-line-strong/10"
                  : "text-muted hover:text-fg-2",
              )}
              title="Card View"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="size-3.5"
                stroke="currentColor"
                strokeWidth="1.3"
              >
                <rect x="2.5" y="2.5" width="5" height="5" rx="1" />
                <rect x="8.5" y="2.5" width="5" height="5" rx="1" />
                <rect x="2.5" y="8.5" width="5" height="5" rx="1" />
                <rect x="8.5" y="8.5" width="5" height="5" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => toggleViewMode("list")}
              className={cn(
                "p-1 rounded-md transition-all",
                viewMode === "list"
                  ? "bg-surface-2 text-fg shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-line-strong/10"
                  : "text-muted hover:text-fg-2",
              )}
              title="List View"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="size-3.5"
                stroke="currentColor"
                strokeWidth="1.3"
              >
                <line x1="2.5" y1="4.5" x2="13.5" y2="4.5" strokeLinecap="round" />
                <line x1="2.5" y1="8.5" x2="13.5" y2="8.5" strokeLinecap="round" />
                <line x1="2.5" y1="12.5" x2="13.5" y2="12.5" strokeLinecap="round" />
                <circle cx="2.5" cy="4.5" r="0.5" fill="currentColor" />
                <circle cx="2.5" cy="8.5" r="0.5" fill="currentColor" />
                <circle cx="2.5" cy="12.5" r="0.5" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 服务器网格/列表 */}
      {!snapshot ? (
        // 冷启动骨架屏,避免闪现"暂无服务器"
        <div
          className={cn(
            viewMode === "card"
              ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "flex flex-col gap-2.5",
          )}
        >
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className={cn("card animate-pulse", viewMode === "card" ? "h-[200px]" : "h-[54px]")}
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        viewMode === "card" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4">
            {filtered.map((s, i) => (
              <ServerCard
                key={s.id}
                server={s}
                online={isServerOnline(now, s)}
                index={i}
                animateIn={!introDone.current}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map((s, i) => (
              <ServerRow
                key={s.id}
                server={s}
                online={isServerOnline(now, s)}
                index={i}
                animateIn={!introDone.current}
              />
            ))}
          </div>
        )
      ) : (
        <div className="card flex flex-col items-center justify-center gap-3 py-20">
          <LotusMark className="size-10 text-faint opacity-60" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-medium text-fg-2">{t("noServers")}</p>
            <p className="text-xs text-faint">{t("noServersDesc")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-medium transition-all",
        active
          ? "border-line-strong bg-surface-2 text-fg"
          : "border-transparent text-muted hover:bg-surface hover:text-fg-2",
      )}
    >
      {label}
      <span className={cn("tnum font-mono text-[10px]", active ? "text-muted" : "text-faint")}>
        {count}
      </span>
    </button>
  );
}
