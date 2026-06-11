import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { CUSTOM_CODE_EVENT } from "./inject";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolved: "dark",
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function systemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (window.ForceTheme === "light" || window.ForceTheme === "dark") {
      return window.ForceTheme;
    }
    return (localStorage.getItem("lotus-theme") as Theme) || "system";
  });
  const [resolved, setResolved] = useState<"light" | "dark">(() =>
    theme === "system" ? systemTheme() : theme,
  );

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("lotus-theme", t);
  }, []);

  useEffect(() => {
    const apply = () => {
      const r = theme === "system" ? systemTheme() : theme;
      setResolved(r);
      document.documentElement.classList.toggle("dark", r === "dark");
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  // 自定义代码注入后,响应其中设置的 window.ForceTheme
  useEffect(() => {
    const onInjected = () => {
      if (window.ForceTheme === "light" || window.ForceTheme === "dark") {
        setThemeState(window.ForceTheme);
      }
    };
    window.addEventListener(CUSTOM_CODE_EVENT, onInjected);
    return () => window.removeEventListener(CUSTOM_CODE_EVENT, onInjected);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>
  );
}
