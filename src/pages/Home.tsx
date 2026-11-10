import { useQuery } from "@tanstack/react-query";
import { ArrowUpDown, Check, LayoutGrid, List, Search, X } from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LotusMark } from "@/components/Logo";
import { Segmented } from "@/components/Segmented";
import { ServerCard } from "@/components/ServerCard";
import { ServerRow } from "@/components/ServerRow";
import { StatsBar } from "@/components/StatsBar";
import { fetchServerGroups } from "@/lib/api";
import { useCycleTransferMap } from "@/lib/cycle";
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
  const [sortOpen, setSortOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const sortListRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"card" | "list">(() => {
    return (localStorage.getItem("lotus-view-mode") as "card" | "list") || "card";
  });

  const toggleViewMode = (mode: "card" | "list") => {
    setViewMode(mode);
    localStorage.setItem("lotus-view-mode", mode);
  };
  // 打字过滤走低优先级更新,避免输入卡顿
  const deferredQuery = useDeferredValue(query);

  // 全局按 "/" 聚焦搜索框，按 Esc 清空/关闭下拉
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape") {
        setSortOpen(false);
        if (document.activeElement === searchRef.current) {
          searchRef.current?.blur();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 点击外部关闭自定义排序菜单
  useEffect(() => {
    if (!sortOpen) return;
    const onClick = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [sortOpen]);

  // 菜单打开后把焦点放到当前选中项,键盘可以直接上下选择
  useEffect(() => {
    if (!sortOpen) return;
    const items = sortListRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]');
    const current = sortListRef.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    (current ?? items?.[0])?.focus();
  }, [sortOpen]);

  const closeSortMenu = () => {
    setSortOpen(false);
    sortButtonRef.current?.focus();
  };

  const onSortMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      sortListRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [],
    );
    if (items.length === 0) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") items[(i + 1) % items.length].focus();
    else if (e.key === "ArrowUp") items[(i - 1 + items.length) % items.length].focus();
    else if (e.key === "Home") items[0].focus();
    else if (e.key === "End") items[items.length - 1].focus();
    else if (e.key === "Escape") {
      // 自己处理并归还焦点;阻止冒泡,避免全局 Esc 逻辑重复执行
      e.stopPropagation();
      closeSortMenu();
      return;
    } else if (e.key === "Tab") {
      setSortOpen(false);
      return;
    } else return;
    e.preventDefault();
  };

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
  const showTransfer = window.ShowNetTransfer !== false;

  // 周期流量(后端实测,需面板配 transfer_*_cycle 告警规则)
  const cycleMap = useCycleTransferMap();

  // 统一卡片各区高度:只要存在带套餐标签的卡片,所有卡片都预留标签行,消除高度参差
  const reserveTags = useMemo(() => {
    for (const s of servers) {
      const note = s.public_note || "";
      if (!note) continue;
      if (
        /"networkRoute"\s*:\s*"[^"]/.test(note) ||
        /"bandwidth"\s*:\s*"[^"]/.test(note) ||
        /"trafficVol"\s*:\s*"[^"]/.test(note) ||
        /"extra"\s*:\s*"[^"]/.test(note) ||
        /"IPv4"\s*:\s*"1"/.test(note) ||
        /"IPv6"\s*:\s*"1"/.test(note)
      ) {
        return true;
      }
    }
    return false;
  }, [servers]);

  const filtered = useMemo(() => {
    let list = servers;
    if (groupId !== null) {
      const g = groups.find((g) => g.group.id === groupId);
      const ids = new Set(g?.servers ?? []);
      list = list.filter((s) => ids.has(s.id));
    }
    if (deferredQuery.trim()) {
      const q = deferredQuery.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.country_code.toLowerCase().includes(q) ||
          s.host.platform.toLowerCase().includes(q),
      );
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

  const currentSortLabel = sortOptions.find((o) => o.key === sort)?.label ?? t("sortDefault");

  return (
    <div className="flex flex-col gap-4 pt-5">
      <StatsBar />

      {/* 工具栏:分组胶囊槽 + 搜索 + 自定义排序菜单 + 视图切换(严格对齐 32px 高度) */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar -mx-4 flex min-w-0 items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Segmented<number | "all">
            label={t("groupFilter")}
            value={groupId ?? "all"}
            onChange={(v) => setGroupId(v === "all" ? null : v)}
            options={[
              {
                value: "all",
                label: (
                  <GroupLabel name={t("all")} count={servers.length} active={groupId === null} />
                ),
              },
              ...groups.map((g) => ({
                value: g.group.id,
                label: (
                  <GroupLabel
                    name={g.group.name}
                    count={g.servers?.length ?? 0}
                    active={groupId === g.group.id}
                  />
                ),
              })),
            ]}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* 搜索框:支持 "/" 快捷键聚焦与一键清除 */}
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <Search
              size={13}
              strokeWidth={2}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint"
            />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-8 w-full rounded-lg border border-line bg-surface pl-8 pr-7 text-xs text-fg shadow-2xs outline-none transition-colors placeholder:text-faint focus:border-line-strong sm:w-52"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-faint transition-colors hover:bg-surface-2 hover:text-fg"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-surface-inset px-1.5 py-px font-mono text-[10px] text-faint sm:inline-block">
                /
              </kbd>
            )}
          </div>

          {/* 排序菜单:打开时焦点落在当前项,方向键移动,Esc 关闭并把焦点还给按钮 */}
          <div ref={sortMenuRef} className="relative shrink-0">
            <button
              ref={sortButtonRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={sortOpen}
              aria-label={`${t("sortBy")}: ${currentSortLabel}`}
              onClick={() => setSortOpen((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  setSortOpen(true);
                }
              }}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg border bg-surface px-2.5 text-xs font-medium shadow-2xs transition-colors",
                sort !== "default"
                  ? "border-accent/35 text-accent"
                  : "border-line text-fg-2 hover:border-line-strong hover:text-fg",
              )}
            >
              <ArrowUpDown size={12} strokeWidth={2} className="text-muted" />
              <span>{currentSortLabel}</span>
            </button>
            {sortOpen && (
              <div
                ref={sortListRef}
                role="menu"
                aria-label={t("sortBy")}
                onKeyDown={onSortMenuKeyDown}
                className="card pop-in absolute right-0 top-[calc(100%+6px)] z-30 min-w-[136px] !rounded-xl p-1 shadow-xl"
              >
                {sortOptions.map((o) => {
                  const active = sort === o.key;
                  return (
                    <button
                      key={o.key}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      tabIndex={-1}
                      onClick={() => {
                        setSort(o.key);
                        closeSortMenu();
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                        active
                          ? "bg-accent/10 font-medium text-accent"
                          : "text-fg-2 hover:bg-surface-inset hover:text-fg focus-visible:bg-surface-inset focus-visible:text-fg",
                      )}
                    >
                      <span>{o.label}</span>
                      {active && <Check size={12} strokeWidth={2.5} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 视图模式切换 */}
          <Segmented
            label={t("viewMode")}
            value={viewMode}
            onChange={toggleViewMode}
            iconOnly
            className="shrink-0"
            options={[
              {
                value: "card",
                title: t("viewCard"),
                label: <LayoutGrid size={13} strokeWidth={2} />,
              },
              { value: "list", title: t("viewList"), label: <List size={14} strokeWidth={2} /> },
            ]}
          />
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
              className={cn("card animate-pulse", viewMode === "card" ? "h-[240px]" : "h-[54px]")}
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
                reserveTags={reserveTags}
                reserveTraffic={showTransfer}
                cycle={cycleMap.get(s.id)}
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
                cycle={cycleMap.get(s.id)}
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

function GroupLabel({ name, count, active }: { name: string; count: number; active: boolean }) {
  return (
    <>
      {name}
      <span
        className={cn(
          "tnum rounded px-1 py-px font-mono text-[10px] leading-none transition-colors",
          active ? "bg-accent/12 font-semibold text-accent" : "text-faint",
        )}
      >
        {count}
      </span>
    </>
  );
}
