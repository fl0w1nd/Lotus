import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useNezhaWS } from "@/lib/ws";

/** WebSocket 断开时的顶部细条提示(连接成功过才提示,冷启动不闪) */
export function ConnectionBanner() {
  const { connected } = useNezhaWS();
  const { t } = useI18n();
  const wasConnected = useRef(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (connected) {
      wasConnected.current = true;
      setShow(false);
      return;
    }
    if (!wasConnected.current) return;
    // 短暂抖动不提示,持续 3s 断开才显示
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, [connected]);

  if (!show) return null;

  return (
    <div className="border-b border-warn/20 bg-warn/10">
      <div className="mx-auto flex h-8 max-w-screen-xl items-center gap-2 px-4 sm:px-6">
        <span className="size-1.5 rounded-full bg-warn animate-pulse-soft" />
        <span className="text-xs text-warn">
          {t("disconnected")} · {t("connecting")}…
        </span>
      </div>
    </div>
  );
}
