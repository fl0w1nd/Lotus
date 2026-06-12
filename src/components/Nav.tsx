import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useCustomCodeReady } from "@/App";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useNezhaWS } from "@/lib/ws";
import { LotusMark } from "./Logo";

function parseCustomLinks(): { name: string; link: string }[] {
  try {
    return window.CustomLinks ? JSON.parse(window.CustomLinks) : [];
  } catch {
    return [];
  }
}

export function Nav({ siteName }: { siteName: string }) {
  const { t, lang, setLang } = useI18n();
  const { theme, resolved, setTheme } = useTheme();
  const { connected } = useNezhaWS();
  const customCodeReady = useCustomCodeReady();
  // biome-ignore lint/correctness/useExhaustiveDependencies: 自定义代码注入后需重新解析 window.CustomLinks
  const customLinks = useMemo(parseCustomLinks, [customCodeReady]);
  const { pathname } = useLocation();

  // 滑动激活指示条:测量当前激活 tab 的位置
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 路由变化后需重新测量激活 tab 位置
  useEffect(() => {
    const measure = () => {
      const el = navRef.current?.querySelector<HTMLAnchorElement>('[data-active="true"]');
      if (el) {
        setIndicator({ left: el.offsetLeft + 10, width: el.offsetWidth - 20 });
      } else {
        setIndicator(null);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [pathname]);

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors whitespace-nowrap sm:px-3",
      isActive ? "text-fg" : "text-muted hover:text-fg-2",
    );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-2 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
          <LotusMark className="size-6 shrink-0 text-accent" />
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="max-w-36 truncate text-[15px] font-semibold tracking-tight sm:max-w-none">
              {siteName}
            </span>
            {window.CustomDesc && (
              <span className="hidden truncate text-xs text-faint md:block">
                {window.CustomDesc}
              </span>
            )}
          </div>
        </Link>

        {/* 移动端可横向滑动,自定义外链不丢失 */}
        <nav
          ref={navRef}
          className="no-scrollbar relative ml-2 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto sm:ml-4 sm:flex-none"
        >
          <NavLink to="/" end className={tabClass} data-active={pathname === "/"}>
            {t("overview")}
          </NavLink>
          <NavLink to="/map" className={tabClass} data-active={pathname.startsWith("/map")}>
            {t("map")}
          </NavLink>
          <NavLink
            to="/services"
            className={tabClass}
            data-active={pathname.startsWith("/services")}
          >
            {t("services")}
          </NavLink>
          {customLinks.map((l) => (
            <a
              key={l.link}
              href={l.link}
              target="_blank"
              rel="noreferrer"
              className="whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:text-fg-2"
            >
              {l.name}
            </a>
          ))}
          {indicator && (
            <span
              className="absolute bottom-0 h-0.5 rounded-full bg-accent transition-[left,width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{ left: indicator.left, width: indicator.width }}
            />
          )}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {/* 连接状态 */}
          <span
            className="mr-1 flex items-center gap-1.5 text-[11px] text-faint"
            title={connected ? t("connected") : t("connecting")}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                connected ? "bg-up animate-pulse-soft" : "bg-warn",
              )}
            />
            <span className="hidden font-mono uppercase tracking-wider md:block">
              {connected ? "live" : "…"}
            </span>
          </span>

          <button
            type="button"
            onClick={() => setLang(lang === "zh-CN" ? "en" : "zh-CN")}
            className="hit-target rounded-md px-2.5 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            {lang === "zh-CN" ? "中" : "EN"}
          </button>

          {/* 管理后台入口(同源 /dashboard) */}
          <a
            href="/dashboard"
            target="_blank"
            rel="noreferrer"
            className="hit-target rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            aria-label={t("admin")}
            title={t("admin")}
          >
            <svg viewBox="0 0 16 16" fill="none" className="size-4">
              <path
                d="M8 1.7 2.7 4v4.2c0 3 2.2 5.3 5.3 6.1 3.1-.8 5.3-3.1 5.3-6.1V4L8 1.7Z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
              <path
                d="M8 7.8a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Zm-2.8 3.4c.5-1.3 1.5-2 2.8-2s2.3.7 2.8 2"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </a>

          <button
            type="button"
            onClick={() =>
              setTheme(theme === "system" ? "light" : theme === "light" ? "dark" : "system")
            }
            className="hit-target rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            aria-label={
              theme === "system"
                ? t("themeSystem")
                : theme === "light"
                  ? t("themeLight")
                  : t("themeDark")
            }
          >
            {theme === "system" ? (
              <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 1a6 6 0 0 1 0 12V2Z" />
              </svg>
            ) : resolved === "dark" ? (
              <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
                <path d="M8 1.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0V2a.5.5 0 0 1 .5-.5ZM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1a.5.5 0 0 1 .5-.5ZM2 8a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1A.5.5 0 0 1 2 8Zm10.5-.5a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1h-1ZM3.05 3.05a.5.5 0 0 1 .707 0l.707.707a.5.5 0 1 1-.707.707l-.707-.707a.5.5 0 0 1 0-.707Zm8.486 8.486a.5.5 0 0 1 .707 0l.707.707a.5.5 0 0 1-.707.707l-.707-.707a.5.5 0 0 1 0-.707Zm1.414-8.486a.5.5 0 0 1 0 .707l-.707.707a.5.5 0 1 1-.707-.707l.707-.707a.5.5 0 0 1 .707 0ZM4.464 11.536a.5.5 0 0 1 0 .707l-.707.707a.5.5 0 0 1-.707-.707l.707-.707a.5.5 0 0 1 .707 0Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
                <path d="M6.2 1.8a6.5 6.5 0 1 0 8 8 .5.5 0 0 0-.62-.62 5 5 0 0 1-6.76-6.76.5.5 0 0 0-.62-.62Z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
