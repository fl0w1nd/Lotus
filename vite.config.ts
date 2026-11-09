import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // 开发时代理到真实哪吒面板或本地 mock 服务器
  const backend = env.NEZHA_BACKEND ?? "http://localhost:8008";

  return {
    plugins: [react(), tailwindcss()],
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
