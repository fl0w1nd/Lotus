import { createContext, type ReactNode, useCallback, useContext, useState } from "react";

const dict = {
  "zh-CN": {
    overview: "总览",
    services: "服务",
    online: "在线",
    offline: "离线",
    all: "全部",
    servers: "台服务器",
    regions: "个地区",
    netSpeed: "实时网速",
    traffic: "总流量",
    upload: "上行",
    download: "下行",
    cpu: "处理器",
    memory: "内存",
    disk: "磁盘",
    swap: "交换",
    load: "负载",
    process: "进程",
    connections: "连接",
    uptime: "在线时长",
    lastActive: "最后上报",
    searchPlaceholder: "搜索服务器…",
    sortDefault: "默认排序",
    sortCpu: "按 CPU",
    sortMem: "按内存",
    sortTraffic: "按流量",
    sortUptime: "按时长",
    noServers: "暂无服务器",
    noServersDesc: "等待 Agent 上报数据",
    backHome: "返回总览",
    realtime: "实时状态",
    pingChart: "网络监控",
    peakCut: "Peak cut",
    history: "历史指标",
    avgDelay: "平均延迟",
    packetLoss: "丢包率",
    serviceUptime: "可用性监控",
    availability: "可用率",
    cycleTransfer: "周期流量",
    nextReset: "重置于",
    notFound: "服务器不存在",
    connecting: "连接中",
    connected: "已连接",
    disconnected: "已断开",
    version: "版本",
    arch: "架构",
    virtualization: "虚拟化",
    bootTime: "启动于",
    temperature: "温度",
    gpu: "GPU",
    map: "节点分布",
    admin: "管理后台",
    route: "线路",
    dualStack: "双栈",
    period1d: "24 小时",
    period7d: "7 天",
    period30d: "30 天",
    loginToView: "登录后可查看更长时间区间",
    netIn: "下行速率",
    netOut: "上行速率",
    tcp: "TCP",
    udp: "UDP",
    billing: "账单",
    expired: "已到期",
    daysLeft: "天后到期",
    free: "免费",
    noServices: "暂无服务监控",
    noServicesDesc: "在管理后台添加服务监控后展示",
    days30: "近 30 天",
    today: "今天",
    daysAgo: "天前",
    noData: "无数据",
    themeSystem: "跟随系统",
    themeLight: "浅色主题",
    themeDark: "深色主题",
  },
  en: {
    overview: "Overview",
    services: "Services",
    online: "Online",
    offline: "Offline",
    all: "All",
    servers: "servers",
    regions: "regions",
    netSpeed: "Network",
    traffic: "Transfer",
    upload: "Up",
    download: "Down",
    cpu: "CPU",
    memory: "Memory",
    disk: "Disk",
    swap: "Swap",
    load: "Load",
    process: "Procs",
    connections: "Conns",
    uptime: "Uptime",
    lastActive: "Last seen",
    searchPlaceholder: "Search servers…",
    sortDefault: "Default",
    sortCpu: "By CPU",
    sortMem: "By Memory",
    sortTraffic: "By Traffic",
    sortUptime: "By Uptime",
    noServers: "No servers",
    noServersDesc: "Waiting for agents to report",
    backHome: "Back to overview",
    realtime: "Realtime",
    pingChart: "Network Monitor",
    peakCut: "Peak cut",
    history: "History",
    avgDelay: "Avg Latency",
    packetLoss: "Packet Loss",
    serviceUptime: "Service Uptime",
    availability: "Availability",
    cycleTransfer: "Cycle Transfer",
    nextReset: "Resets",
    notFound: "Server not found",
    connecting: "Connecting",
    connected: "Live",
    disconnected: "Offline",
    version: "Version",
    arch: "Arch",
    virtualization: "Virt",
    bootTime: "Booted",
    temperature: "Temp",
    gpu: "GPU",
    map: "Node Map",
    admin: "Admin Panel",
    route: "Route",
    dualStack: "Dual Stack",
    period1d: "24h",
    period7d: "7d",
    period30d: "30d",
    loginToView: "Sign in to view longer time ranges",
    netIn: "Inbound",
    netOut: "Outbound",
    tcp: "TCP",
    udp: "UDP",
    billing: "Billing",
    expired: "Expired",
    daysLeft: "days left",
    free: "Free",
    noServices: "No service monitors",
    noServicesDesc: "Add service monitors in the admin panel",
    days30: "Last 30 days",
    today: "Today",
    daysAgo: "d ago",
    noData: "No data",
    themeSystem: "System theme",
    themeLight: "Light theme",
    themeDark: "Dark theme",
  },
} as const;

export type Lang = keyof typeof dict;
type DictKey = keyof (typeof dict)["zh-CN"];

interface I18nValue {
  lang: Lang;
  t: (key: DictKey) => string;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nValue>({
  lang: "zh-CN",
  t: (k) => k,
  setLang: () => {},
});

export const useI18n = () => useContext(I18nContext);

function detectLang(): Lang {
  const saved = localStorage.getItem("lotus-lang");
  if (saved === "zh-CN" || saved === "en") return saved;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("lotus-lang", l);
  }, []);

  const t = useCallback((key: DictKey) => dict[lang][key] ?? key, [lang]);

  return <I18nContext.Provider value={{ lang, t, setLang }}>{children}</I18nContext.Provider>;
}
