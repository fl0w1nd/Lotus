import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { WSResponse } from "@/types/nezha";

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
          const data = JSON.parse(event.data) as WSResponse;
          for (const s of data.servers ?? []) {
            const arr = history.current.get(s.id) ?? [];
            arr.push({
              t: data.now,
              cpu: s.state.cpu ?? 0,
              memPct: s.host.mem_total ? (s.state.mem_used / s.host.mem_total) * 100 : 0,
              up: s.state.net_out_speed ?? 0,
              down: s.state.net_in_speed ?? 0,
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
