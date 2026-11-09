import { execSync } from "node:child_process";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// 主题版本:发版时由 CI 通过 LOTUS_VERSION 传入 tag;本地构建回退到
// git describe(如 v1.1.0-4-gb07969e-dirty),拿不到 git 信息时为 "dev"
function resolveVersion(env: Record<string, string>) {
  if (env.LOTUS_VERSION) return env.LOTUS_VERSION;
  try {
    return execSync("git describe --tags --always --dirty", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "dev";
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // 开发时代理到真实哪吒面板或本地 mock 服务器
  const backend = env.NEZHA_BACKEND ?? "http://localhost:8008";

  return {
    plugins: [react(), tailwindcss()],
    define: {
      __LOTUS_VERSION__: JSON.stringify(resolveVersion(env)),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api/v1/ws": {
          target: backend,
          ws: true,
          changeOrigin: true,
        },
        "/api/v1": {
          target: backend,
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
      // 产物文件名使用默认的内容 hash:面板 v2.5.0+ 对 index.html 返回
      // Cache-Control: no-store,每次都会拿到引用最新 hash 的入口;
      // 挂载 user-dist 时资源没有 Cache-Control,带 hash 才能避免浏览器
      // 启发式缓存把旧 JS 与新 index.html 混用
    },
  };
});
