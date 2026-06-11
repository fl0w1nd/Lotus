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
      rollupOptions: {
        output: {
          // 固定文件名(不带 hash):nezha 后端 serve 静态文件不带
          // Cache-Control,index.html 会被浏览器启发式缓存;主题更新后
          // 旧 index.html 引用带旧 hash 的 JS 会 404 白屏。固定文件名让
          // 新旧 index.html 永远指向存在的文件,更新靠 Last-Modified 协商
          entryFileNames: "assets/[name].js",
          chunkFileNames: "assets/[name].js",
          assetFileNames: "assets/[name][extname]",
        },
      },
    },
  };
});
