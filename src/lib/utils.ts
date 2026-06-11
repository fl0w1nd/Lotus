import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { NezhaServer } from "@/types/nezha";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];

export function formatBytes(bytes: number, digits = 1): string {
  if (!bytes || bytes <= 0) return "0 B";
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const v = bytes / 1024 ** i;
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : digits)} ${UNITS[i]}`;
}

export function formatSpeed(bps: number): string {
  return `${formatBytes(bps)}/s`;
}

export function formatUptime(seconds: number, lang: string): string {
  const zh = lang.startsWith("zh");
  if (seconds < 3600)
    return zh ? `${Math.floor(seconds / 60)} 分钟` : `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400)
    return zh ? `${Math.floor(seconds / 3600)} 小时` : `${Math.floor(seconds / 3600)}h`;
  return zh ? `${Math.floor(seconds / 86400)} 天` : `${Math.floor(seconds / 86400)}d`;
}

export function parseISOTimestamp(iso: string): number {
  return new Date(iso).getTime();
}

export function isServerOnline(now: number, server: NezhaServer): boolean {
  if (server.last_active.startsWith("000")) return false;
  return now - parseISOTimestamp(server.last_active) <= 30_000;
}

export function memPercent(s: NezhaServer): number {
  if (!s.host.mem_total) return 0;
  return (s.state.mem_used / s.host.mem_total) * 100;
}

export function diskPercent(s: NezhaServer): number {
  if (!s.host.disk_total) return 0;
  return (s.state.disk_used / s.host.disk_total) * 100;
}

const CYCLE_MONTHS: [RegExp, number][] = [
  [/^(月|m|mo|month|monthly)$/i, 1],
  [/^(季|q|qr|quarterly)$/i, 3],
  [/^(半|半年|h|half|semi-annually)$/i, 6],
  [/^(年|y|yr|year|annual|annually)$/i, 12],
];

/**
 * 账单剩余天数。autoRenewal 为 "1" 时账单到期后自动滚动到下一周期
 * (与 nezha-dash 行为一致),返回 null 表示无账单数据。
 */
export function billingDaysLeft(billing?: {
  endDate?: string;
  autoRenewal?: string;
  cycle?: string;
}): number | null {
  if (!billing?.endDate) return null;
  const end = new Date(billing.endDate).getTime();
  if (Number.isNaN(end)) return null;
  const now = Date.now();
  const days = Math.floor((end - now) / 86_400_000);
  if (days >= 0 || billing.autoRenewal !== "1") return days;

  const months = CYCLE_MONTHS.find(([re]) => re.test(billing.cycle ?? ""))?.[1] ?? 1;
  const d = new Date(end);
  while (d.getTime() <= now) {
    d.setMonth(d.getMonth() + months);
  }
  return Math.floor((d.getTime() - now) / 86_400_000);
}

/** 从 CPU 型号字符串解析核心数,如 "AMD EPYC 7763 4 Virtual Core" */
export function cpuCoreCount(cpu?: string[]): number | null {
  if (!cpu?.length) return null;
  const m = cpu[0].match(/(\d+)\s+(?:virtual|physical)?\s*core/i);
  return m ? Number(m[1]) : null;
}

export function countryFlag(code: string): string {
  if (!code) return "🌐";
  const cc = code.toUpperCase();
  if (cc === "TW") return "🇹🇼";
  if (cc.length !== 2 || !/^[A-Z]{2}$/.test(cc)) return "🌐";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

const PLATFORM_NAMES: Record<string, string> = {
  darwin: "macOS",
  freebsd: "FreeBSD",
  openbsd: "OpenBSD",
  tencentos: "TencentOS",
  almalinux: "AlmaLinux",
  opensuse: "openSUSE",
  rocky: "Rocky",
};

export function platformName(platform: string): string {
  if (!platform) return "Unknown";
  const p = platform.toLowerCase();
  if (PLATFORM_NAMES[p]) return PLATFORM_NAMES[p];
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

/** 公开备注中的计费/套餐信息(兼容 nezha-dash 约定的 public_note JSON) */
export interface PublicNote {
  billingDataMod?: {
    startDate?: string;
    endDate?: string;
    autoRenewal?: string;
    cycle?: string;
    amount?: string;
  };
  planDataMod?: {
    bandwidth?: string;
    trafficVol?: string;
    trafficType?: string;
    IPv4?: string;
    IPv6?: string;
    networkRoute?: string;
    extra?: string;
  };
}

export function parsePublicNote(note: string): PublicNote | null {
  if (!note) return null;
  try {
    return JSON.parse(note) as PublicNote;
  } catch {
    return null;
  }
}
