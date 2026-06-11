import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LotusMark } from "@/components/Logo";
import { fetchService } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn, formatBytes } from "@/lib/utils";
import type { CycleTransferData, ServiceData } from "@/types/nezha";

export default function Services() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["service"],
    queryFn: fetchService,
    refetchInterval: 60_000,
  });

  const services = Object.entries(data?.data?.services ?? {});
  const cycles = Object.entries(data?.data?.cycle_transfer_stats ?? {});

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-5">
        <div className="flex items-baseline justify-between">
          <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
          <div className="h-3 w-16 animate-pulse rounded bg-surface-2" />
        </div>
        <div className="card divide-y divide-line">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2.5 px-4 py-3.5">
              <div className="flex items-baseline justify-between">
                <div
                  className="h-3.5 w-28 animate-pulse rounded bg-surface-2"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
                <div
                  className="h-3 w-20 animate-pulse rounded bg-surface-2"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              </div>
              <div className="flex h-6 items-end gap-[3px]">
                {Array.from({ length: 30 }, (_, j) => (
                  <div
                    key={j}
                    className="h-full flex-1 animate-pulse rounded-[3px] bg-surface-2"
                    style={{ animationDelay: `${i * 120 + j * 12}ms` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-5">
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-tight">{t("serviceUptime")}</h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
            {t("days30")}
          </span>
        </div>
        {services.length > 0 ? (
          <div className="card divide-y divide-line">
            {services.map(([id, svc]) => (
              <ServiceRow key={id} service={svc} />
            ))}
          </div>
        ) : (
          <div className="card flex flex-col items-center gap-3 py-16">
            <LotusMark className="size-10 text-faint opacity-60" />
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm font-medium text-fg-2">{t("noServices")}</p>
              <p className="text-xs text-faint">{t("noServicesDesc")}</p>
            </div>
          </div>
        )}
      </section>

      {cycles.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-tight">{t("cycleTransfer")}</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {cycles.map(([id, cycle]) => (
              <CycleCard key={id} cycle={cycle} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ServiceRow({ service }: { service: ServiceData }) {
  const { t } = useI18n();
  // 点选/悬停的日期索引,在色块下方输出详情(触屏可用,不依赖 title)
  const [picked, setPicked] = useState<number | null>(null);

  const total = service.total_up + service.total_down;
  const availability = total > 0 ? (service.total_up / total) * 100 : 100;
  const days = service.up.map((up, i) => {
    const down = service.down[i] ?? 0;
    const sum = up + down;
    return {
      ratio: sum > 0 ? up / sum : -1,
      delay: service.delay[i] ?? 0,
    };
  });
  const currentDelay = service.delay.at(-1) ?? 0;
  const sel = picked !== null ? days[picked] : null;
  const dayLabel = (i: number) => {
    const ago = days.length - 1 - i;
    return ago === 0 ? t("today") : `${ago} ${t("daysAgo")}`;
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: onMouseLeave 仅为鼠标悬停增强,核心交互在内部 button
    <div className="flex flex-col gap-2.5 px-4 py-3.5" onMouseLeave={() => setPicked(null)}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="truncate text-[13px] font-medium">{service.service_name}</h3>
        <div className="tnum flex shrink-0 items-baseline gap-3 font-mono text-[11px]">
          <span className="text-faint">
            {currentDelay > 0 ? `${currentDelay.toFixed(0)} ms` : ""}
          </span>
          <span
            className={cn(
              availability >= 99 ? "text-up" : availability >= 95 ? "text-warn" : "text-down",
            )}
          >
            {availability.toFixed(availability >= 99.95 ? 1 : 2)}%{" "}
            <span className="hidden text-faint sm:inline">{t("availability")}</span>
          </span>
        </div>
      </div>
      <div className="flex h-6 items-end gap-[3px]">
        {days.map((d, i) => (
          <button
            type="button"
            key={i}
            onClick={() => setPicked(i)}
            onMouseEnter={() => setPicked(i)}
            aria-label={dayLabel(i)}
            className={cn(
              "h-full min-w-0 flex-1 rounded-[3px] transition-all duration-150",
              d.ratio < 0
                ? "bg-line"
                : d.ratio >= 0.99
                  ? "bg-up/65"
                  : d.ratio >= 0.9
                    ? "bg-warn/70"
                    : "bg-down/70",
              picked === i
                ? "brightness-125 ring-1 ring-fg/60 ring-offset-1 ring-offset-surface"
                : "hover:brightness-125",
            )}
          />
        ))}
      </div>
      {/* 选中日详情行 */}
      <p
        className={cn(
          "tnum font-mono text-[10.5px] leading-none transition-opacity",
          sel ? "text-muted opacity-100" : "text-faint opacity-60",
        )}
      >
        {sel && picked !== null
          ? sel.ratio < 0
            ? `${dayLabel(picked)} · ${t("noData")}`
            : `${dayLabel(picked)} · ${t("availability")} ${(sel.ratio * 100).toFixed(2)}% · ${t("avgDelay")} ${sel.delay.toFixed(0)} ms`
          : t("days30")}
      </p>
    </div>
  );
}

function CycleCard({ cycle }: { cycle: CycleTransferData }) {
  const { t } = useI18n();
  const serverIds = Object.keys(cycle.server_name ?? {});

  return (
    <div className="card flex flex-col gap-3 p-4">
      {/* flex-wrap 防止窄屏标题与日期挤压重叠 */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <h3 className="min-w-0 truncate text-[13px] font-medium">{cycle.name}</h3>
        <span className="tnum shrink-0 font-mono text-[10px] text-faint">
          {new Date(cycle.from).toLocaleDateString()} → {new Date(cycle.to).toLocaleDateString()}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {serverIds.map((sid) => {
          const used = cycle.transfer?.[sid] ?? 0;
          const max = cycle.max || 1;
          const pct = Math.min((used / max) * 100, 100);
          return (
            <div key={sid}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-[11px] text-fg-2">{cycle.server_name[sid]}</span>
                <span className="tnum shrink-0 font-mono text-[10px] text-muted">
                  {formatBytes(used)} <span className="text-faint">/ {formatBytes(max)}</span>
                </span>
              </div>
              <div className="h-[3px] overflow-hidden rounded-full bg-line">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-700",
                    pct >= 90 ? "bg-down" : pct >= 75 ? "bg-warn" : "bg-c-cpu",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {serverIds.length > 0 && cycle.next_update?.[serverIds[0]] && (
        <p className="font-mono text-[10.5px] text-faint">
          {t("nextReset")}: {new Date(cycle.next_update[serverIds[0]]).toLocaleString()}
        </p>
      )}
    </div>
  );
}
