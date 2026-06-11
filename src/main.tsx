import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { I18nProvider } from "./lib/i18n";
import { ThemeProvider } from "./lib/theme";
import { WSProvider } from "./lib/ws";
import "./index.css";

// 应用成功启动:清除 index.html 自愈脚本的一次性 reload 标记
sessionStorage.removeItem("lt-recovered");

// 防御性清理:此前部署的其他前端(PWA 主题)可能注册过 Service Worker,
// 残留的 SW 会继续拦截导航并返回已失效的缓存资产,导致白屏
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) reg.unregister();
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 30_000,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <WSProvider>
            {/* Hash 路由:nezha 后端的 SPA fallback 白名单不含本主题的
                自定义路由(如 /services),BrowserRouter 直接刷新会拿到
                404。Hash 路由所有页面都请求 /,彻底绕开该限制 */}
            <HashRouter>
              <App />
            </HashRouter>
          </WSProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
