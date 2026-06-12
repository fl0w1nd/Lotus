import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { ConnectionBanner } from "./components/ConnectionBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Footer } from "./components/Footer";
import { Nav } from "./components/Nav";
import { fetchSetting } from "./lib/api";
import { useHealthFavicon } from "./lib/favicon";
import { useI18n } from "./lib/i18n";
import { CUSTOM_CODE_EVENT, injectCustomCode } from "./lib/inject";
import { useTheme } from "./lib/theme";
import Home from "./pages/Home";
import NodeMapPage from "./pages/NodeMap";
import ServerDetail from "./pages/ServerDetail";
import Services from "./pages/Services";

/** 自定义代码注入完成后翻转,驱动依赖 window.* 变量的组件刷新 */
export function useCustomCodeReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const on = () => setReady(true);
    window.addEventListener(CUSTOM_CODE_EVENT, on);
    return () => window.removeEventListener(CUSTOM_CODE_EVENT, on);
  }, []);
  return ready;
}

export default function App() {
  const { lang, setLang } = useI18n();
  const { resolved } = useTheme();
  const { pathname } = useLocation();
  const customCodeReady = useCustomCodeReady();

  const { data: setting } = useQuery({
    queryKey: ["setting"],
    queryFn: fetchSetting,
  });

  const siteName = setting?.data?.config?.site_name || "Lotus";

  useEffect(() => {
    document.title = siteName;
  }, [siteName]);

  // 注入管理后台的自定义代码(CSS/JS)
  useEffect(() => {
    const code = setting?.data?.config?.custom_code;
    if (code) injectCustomCode(code);
  }, [setting?.data?.config?.custom_code]);

  // 面板语言作为默认语言(用户手动选择优先)
  useEffect(() => {
    const panelLang = setting?.data?.config?.language;
    if (panelLang && !localStorage.getItem("lotus-lang")) {
      setLang(panelLang.toLowerCase().startsWith("zh") ? "zh-CN" : "en");
    }
  }, [setting?.data?.config?.language, setLang]);

  // <html lang> 跟随界面语言(屏幕阅读器发音正确)
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // theme-color 跟随明暗主题(移动端地址栏)
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = resolved === "dark" ? "#131316" : "#fbfbfa";
  }, [resolved]);

  // 整体健康状态驱动 favicon 颜色
  useHealthFavicon();

  // biome-ignore lint/correctness/useExhaustiveDependencies: 自定义代码注入后需重读 window.* 变量
  useEffect(() => {
    const bg =
      window.innerWidth < 768
        ? window.CustomMobileBackgroundImage || window.CustomBackgroundImage
        : window.CustomBackgroundImage;
    if (bg) {
      document.body.style.backgroundImage = `url(${bg})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundAttachment = "fixed";
    }
  }, [customCodeReady]);

  return (
    <div className="flex min-h-svh flex-col">
      <div className="ambient" aria-hidden />
      <Nav siteName={siteName} />
      <ConnectionBanner />
      <main
        key={pathname}
        className="fade-up mx-auto w-full max-w-screen-xl flex-1 px-4 pb-12 sm:px-6"
      >
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/server/:id" element={<ServerDetail />} />
            <Route path="/services" element={<Services />} />
            <Route path="/map" element={<NodeMapPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <Footer version={setting?.data?.version} />
    </div>
  );
}
