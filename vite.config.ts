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
    },
  };
});
