import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { I18nProvider } from "./lib/i18n";
import { ThemeProvider } from "./lib/theme";
import { WSProvider } from "./lib/ws";
import "./index.css";

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
