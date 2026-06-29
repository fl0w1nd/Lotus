import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchService } from "@/lib/api";
import type { CycleTransferData, ServerCycleInfo } from "@/types/nezha";

/** 把后端 cycle_transfer_stats(按告警规则分组)扁平成 服务器ID → 周期用量 */
function buildCycleMap(
  stats: { [cycleId: string]: CycleTransferData } | null | undefined,
): Map<number, ServerCycleInfo> {
  const map = new Map<number, ServerCycleInfo>();
  if (!stats) return map;
  for (const cycle of Object.values(stats)) {
    const transfer = cycle.transfer ?? {};
    for (const sid of Object.keys(transfer)) {
      const id = Number(sid);
      // 一台机器可能命中多条规则,取首个匹配即可
      if (Number.isNaN(id) || map.has(id)) continue;
      map.set(id, {
        cycleName: cycle.name,
        used: transfer[sid] ?? 0,
        max: cycle.max,
        from: cycle.from,
        to: cycle.to,
      });
    }
  }
  return map;
}

/**
 * 周期流量映射(serverId → 真实周期用量)。
 * 数据来自 /api/v1/service 的 cycle_transfer_stats,仅当面板配置了
 * transfer_*_cycle 告警规则时才有;未配置则返回空 Map。
 */
export function useCycleTransferMap(): Map<number, ServerCycleInfo> {
  const { data } = useQuery({
    queryKey: ["service"],
    queryFn: fetchService,
    refetchInterval: 60_000,
  });
  return useMemo(() => buildCycleMap(data?.data?.cycle_transfer_stats), [data]);
}
