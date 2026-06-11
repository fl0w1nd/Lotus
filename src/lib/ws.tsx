import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { NezhaServer, ServerHost, ServerState, WSResponse } from "@/types/nezha";

/**
 * 后端所有字段都带 json omitempty——零值字段会从 JSON 中整个消失
 * (如 load_1 为 0 时不存在 load_1 键)。在唯一数据入口归一化,
 * 下游组件可以放心使用 .toFixed() / .join() 等。
 */
const HOST_DEFAULTS: ServerHost = {
  platform: "",
  platform_version: "",
  cpu: [],
  gpu: [],
  mem_total: 0,
  disk_total: 0,
  swap_total: 0,
  arch: "",
  boot_time: 0,
  version: "",
};

const STATE_DEFAULTS: ServerState = {
  cpu: 0,
  mem_used: 0,
  swap_used: 0,
  disk_used: 0,
  net_in_transfer: 0,
  net_out_transfer: 0,
  net_in_speed: 0,
  net_out_speed: 0,
  uptime: 0,
  load_1: 0,
  load_5: 0,
  load_15: 0,
  tcp_conn_count: 0,
  udp_conn_count: 0,
  process_count: 0,
  temperatures: [],
  gpu: [],
};

/**
 * 后端仅在 WebSocket 第一帧下发 public_note(后续帧恒为空,见
 * nezha getServerStat(count == 0, ...)),缓存首帧值供后续帧回退,
 * 否则账单/套餐信息在连接 2 秒后就会消失。
 */
const noteCache = new Map<number, string>();

function normalizeServer(s: Partial<NezhaServer>): NezhaServer {
  const id = s.id ?? 0;
  if (s.public_note) {
    noteCache.set(id, s.public_note);
  }
  return {
    id,
    name: s.name ?? "",
    public_note: s.public_note || noteCache.get(id) || "",
    last_active: s.last_active ?? "",
    country_code: s.country_code ?? "",
    host: { ...HOST_DEFAULTS, ...s.host },
    state: { ...STATE_DEFAULTS, ...s.state },
  };
}

export interface HistoryPoint {
  t: number;
  cpu: number;
  memPct: number;
  up: number;
  down: number;
}

const HISTORY_CAP = 90;

interface WSContextValue {
  snapshot: WSResponse | null;
  connected: boolean;
  /** 每台服务器最近的实时采样,用于卡片迷你图 */
  historyOf: (serverId: number) => HistoryPoint[];
}

const WSContext = createContext<WSContextValue>({
  snapshot: null,
  connected: false,
  historyOf: () => [],
});

export function useNezhaWS() {
  return useContext(WSContext);
}

export function WSProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<WSResponse | null>(null);
  const [connected, setConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retries = useRef(0);
  const history = useRef(new Map<number, HistoryPoint[]>());

  const historyOf = useCallback((serverId: number) => history.current.get(serverId) ?? [], []);

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const url = new URL("/api/v1/ws/server", window.location.origin);
      url.protocol = url.protocol.replace("http", "ws");
      const socket = new WebSocket(url);
      ws.current = socket;

      socket.onopen = () => {
        retries.current = 0;
        setConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data) as WSResponse;
          const data: WSResponse = {
            now: raw.now ?? Date.now(),
            servers: (raw.servers ?? []).map(normalizeServer),
          };
          for (const s of data.servers) {
            const arr = history.current.get(s.id) ?? [];
            arr.push({
              t: data.now,
              cpu: s.state.cpu,
              memPct: s.host.mem_total ? (s.state.mem_used / s.host.mem_total) * 100 : 0,
              up: s.state.net_out_speed,
              down: s.state.net_in_speed,
            });
            if (arr.length > HISTORY_CAP) arr.splice(0, arr.length - HISTORY_CAP);
            history.current.set(s.id, arr);
          }
          setSnapshot(data);
        } catch (err) {
          console.warn("[lotus] failed to parse ws message:", err);
        }
      };

      socket.onclose = () => {
        setConnected(false);
        ws.current = null;
        if (!disposed && retries.current < 60) {
          retries.current += 1;
          retryTimer.current = setTimeout(connect, 3000);
        }
      };

      socket.onerror = () => socket.close();
    };

    connect();
    return () => {
      disposed = true;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      ws.current?.close();
    };
  }, []);

  return (
    <WSContext.Provider value={{ snapshot, connected, historyOf }}>{children}</WSContext.Provider>
  );
}
