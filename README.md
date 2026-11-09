<div align="center">

# 🪷 Lotus

**哪吒监控主题** · 跟随系统 · 玻璃质感 · 克制色彩

为 [哪吒监控](https://github.com/nezhahq/nezha) **v2**（v2.5.0+）打造的用户前端主题

[![CI](https://github.com/fl0w1nd/Lotus/actions/workflows/ci.yml/badge.svg)](https://github.com/fl0w1nd/Lotus/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/fl0w1nd/Lotus?include_prereleases&label=release&color=blue)](https://github.com/fl0w1nd/Lotus/releases)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=61dafb)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=3178c6)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=06b6d4)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=646cff)](https://vitejs.dev)

</div>

> 名字取自哪吒的莲花化身 —— 莲（Lotus）。

设计语言取法 Vercel / Linear / Apple：跟随系统深浅色、玻璃质感卡片、等宽数字排版、克制的色彩——让色彩只承载信息（在线 / 告警 / 离线），其余交给灰阶与留白。

![preview](docs/preview-light.png)
![nodemap](docs/preview-nodemap.png)

<details>
<summary>📷 更多预览（暗色 / 详情页 / 服务页）</summary>

![dark](docs/preview-dark.png)
![detail](docs/preview-detail.png)
![services](docs/preview-services.png)

</details>

---

## ✨ 特性

- **节点分布页** — 独立导航标签，左侧 HUD 面板（在线率环形图、地区统计、平均 CPU / 内存条）+ 右侧 Stripe 风格点阵世界地图（构建期生成，运行时零依赖），点击国家展开服务器详情卡片
- **实时总览** — WebSocket 实时流（`/api/v1/ws/server`），聚合统计条（在线数 / 地区 / 实时网速 / 总流量）带数字滚动动画
- **服务器卡片 / 列表** — 卡片与列表双视图，一键切换（持久化偏好）；卡片模式展示 OS 发行版图标（simple-icons）、CPU / 内存 / 磁盘渐变进度（75% 变琥珀、90% 变红）、实时网速 + 流量、迷你网速曲线图；列表模式紧凑五行布局
- **分组 / 搜索 / 排序** — 服务器分组过滤、模糊搜索、按 CPU / 内存 / 流量 / 在线时长排序
- **服务器详情** — 主机信息芯片（含虚拟化类型）、实时指标瓦片、GPU 利用率 + 显存（多卡，显存需面板 v2.3.9+ / Agent v2.3.5+）、温度传感器条、负载相对核心数着色、CPU + 内存 / 网络实时曲线、TCP / TCPing 网络监控多线图（可逐线开关 + Peak Cut 峰值裁剪）
- **TSDB 历史指标** — v2 新增 `/api/v1/server/{id}/metrics`，支持 CPU / 内存 / 磁盘 / 上下行 / 负载 / 进程 / 连接 8 种指标（有 GPU 的机器额外提供 GPU 利用率），24h / 7d / 30d 切换；`tsdb_enabled: false` 时自动隐藏
- **服务页** — 30 天可用性方块图（Vercel status 风格）+ 周期流量统计进度
- **账单与套餐** — 解析 `public_note` 中的计费数据（与 nezha-dash 约定兼容），六级到期色阶指示（已到期 / ≤3 天脉冲红 → ≤30 天灰阶）、流量用量进度条、套餐标签（带宽 / 流量 / IPv4 / IPv6 / 线路）
- **自定义代码注入** — 管理后台「自定义代码」中的 CSS / JS 会被注入页面，所有官方变量可用
- **健康感知 favicon** — 浏览器标签图标随整体健康状态变色（正常紫 / 有离线琥珀 / 大面积故障红）
- **断线提示** — WebSocket 断开超 3 秒显示顶部重连提示条
- **暗 / 亮主题** — 默认跟随系统，可手动切换（系统 → 浅色 → 深色三态循环），支持 `window.ForceTheme` 强制；`theme-color` 与 `<html lang>` 动态同步
- **中 / 英双语** — 跟随浏览器语言与面板 `language` 配置，可手动切换
- **可访问性** — 全局键盘焦点环、WCAG 对比度校准、移动端完整适配、入场动画尊重 `prefers-reduced-motion`

---

## 🚀 快速部署

> **版本要求**：Lotus v1.2.0 起需要哪吒面板 **v2.5.0+**。面板低于 v2.5.0 时请继续使用 [Lotus v1.1.0](https://github.com/fl0w1nd/Lotus/releases/tag/v1.1.0)，并按该版本 README 配置部署。

### 方式一：面板「前端管理」一键安装（推荐）

哪吒面板 v2.5.0 起内置前端管理，可直接从 GitHub Release 安装和切换主题，无需挂载目录或单独托管静态文件，也无需重启面板。

1. 以管理员身份进入后台 **设置 → 前端管理**，选择 **用户前端**
2. 仓库地址填写：

   ```text
   https://github.com/fl0w1nd/Lotus
   ```

3. 读取发布版本，选择 **v1.2.0 或更新的版本**（更早版本的压缩包结构不符合要求，安装会失败）
4. 点击 **安装**，完成后点击 **启用**

升级时在同一页面安装新版本并启用即可；旧版本不会自动删除，切换后可在列表中手动删除。想换回官方主题时，在列表中启用内置的 `user-dist`。

> **💡 提示**：安装内容保存在面板配置文件同目录的 `frontends/` 下。Docker 部署需要持久化并保证该目录可写（官方 compose 中挂载的 `./data:/dashboard/data` 已满足）。

### 方式二：挂载 `user-dist` 目录

适合面板无法访问 GitHub 的离线环境。面板在提供前端文件时优先读取本地目录，再回退到内嵌资源，把主题放到 `user-dist` 即可覆盖官方主题。

前往 [Releases](https://github.com/fl0w1nd/Lotus/releases) 下载最新的 `dist.zip`，解压后得到 `dist/` 目录：

```bash
wget https://github.com/fl0w1nd/Lotus/releases/latest/download/dist.zip
unzip dist.zip
```

**Docker：**

```yaml
# docker-compose.yml
services:
  dashboard:
    image: ghcr.io/nezhahq/nezha:latest
    volumes:
      - ./data:/dashboard/data
      - ./dist:/dashboard/user-dist:ro   # ← 挂载主题
    ports:
      - 8008:8008
```

```bash
docker compose up -d
```

**二进制（一键脚本安装，默认路径 `/opt/nezha/dashboard/`）：**

```bash
sudo rm -rf /opt/nezha/dashboard/user-dist
sudo cp -r dist /opt/nezha/dashboard/user-dist
sudo systemctl restart nezha-dashboard
```

> **💡 提示**：更新时用新版 `dist/` 整体替换旧目录（不要只覆盖，旧的带 hash 资源文件会残留），然后重启面板。

> 使用方式二时，面板「设置」中的用户前端需要保持为内置的 `user-dist`。

### 前置反向代理

反向代理用于 HTTPS、Agent 的 gRPC 和前端的 WebSocket，与使用哪种安装方式无关。面板 v2.5.0 已修复静态资源 304 被改写为 200 的问题，**不再需要**剥离 `If-Modified-Since` / `If-None-Match` 请求头。

**Nginx：**

```nginx
server {
  listen 443 ssl;
  server_name status.example.com;

  location ^~ /proto.NezhaService/ {
    grpc_pass grpc://127.0.0.1:8008;
    grpc_set_header Host $host;
    grpc_set_header nz-realip $remote_addr;
    grpc_read_timeout 600s;
    grpc_send_timeout 600s;
    grpc_socket_keepalive on;
    client_max_body_size 10m;
  }

  location ~* ^/api/v1/ws/(server|terminal|file)(.*)$ {
    proxy_pass http://127.0.0.1:8008;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header nz-realip $remote_addr;
    proxy_set_header Origin https://$host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
  }

  location / {
    proxy_pass http://127.0.0.1:8008;
    proxy_set_header Host $host;
    proxy_set_header nz-realip $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_max_temp_file_size 0;
  }
}
```

**Caddy：**

```caddyfile
status.example.com {
    @grpc path /proto.NezhaService/*
    handle @grpc {
        reverse_proxy h2c://127.0.0.1:8008 {
            header_up Host {host}
            header_up nz-realip {remote_host}
        }
    }

    @ws path_regexp ws ^/api/v1/ws/(server|terminal|file).*
    handle @ws {
        reverse_proxy 127.0.0.1:8008 {
            header_up Host {host}
            header_up Origin https://{host}
            header_up nz-realip {remote_host}
        }
    }

    handle {
        reverse_proxy 127.0.0.1:8008 {
            header_up Host {host}
            header_up nz-realip {remote_host}
        }
    }
}
```

Cloudflare 代理开启时，`nz-realip` 可改为：

```caddyfile
header_up nz-realip {http.request.header.CF-Connecting-IP}
```

Docker Compose 场景可将示例中的 `127.0.0.1:8008` 统一替换为 `nezha-dashboard:3001`。

> 从旧版 README 升级过来的配置中如果还有剥离 `If-*` 请求头的两行，在面板 v2.5.0+ 上可以删除，保留也不影响使用。

<details>
<summary>📦 其他方式：独立托管 + 反向代理</summary>

将 `dist/` 部署到任意静态服务（nginx / Caddy / CDN），将 `/api/v1/` 反代到面板并保留 WebSocket 升级头。本主题使用 Hash 路由，静态服务直接返回入口文件与资源即可。建议对 `index.html` 设置 `Cache-Control: no-cache`，`assets/` 下的文件名带内容 hash，可以长期缓存：

```nginx
server {
  listen 443 ssl;
  server_name status.example.com;

  root /var/www/lotus-dist;

  location = /index.html {
    add_header Cache-Control "no-cache";
  }

  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  location /api/v1/ {
    proxy_pass http://dashboard:8008;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }
}
```

</details>

---

## ⚙️ 自定义变量

与官方主题保持兼容，在管理后台「自定义代码」中设置：

| 变量 | 说明 |
| --- | --- |
| `window.ForceTheme` | `"light"` / `"dark"` 强制颜色主题 |
| `window.CustomLogo` | 替换左上角 Logo 图片 URL |
| `window.CustomDesc` | 站名旁的描述文本 |
| `window.CustomLinks` | 自定义外链，JSON 字符串，如 `'[{"name":"Blog","link":"https://example.com"}]'` |
| `window.CustomBackgroundImage` | 桌面端背景图 URL |
| `window.CustomMobileBackgroundImage` | 移动端背景图 URL |
| `window.ShowNetTransfer` | 是否在卡片显示累计流量（本主题默认显示，设为 `false` 可隐藏） |
| `window.ForceUseSvgFlag` | 强制使用 SVG 国旗（Windows 平台会自动启用，emoji 国旗在 Windows 不可用） |

---

## 🛠 开发

```bash
pnpm install
pnpm mock   # 终端 1：启动本地 mock 哪吒 v2 后端（REST + WS，端口 8008）
pnpm dev    # 终端 2：启动 Vite 开发服务器
```

本地 mock 默认管理员态，可直接测试网络监控 7 天 / 30 天；游客态用
`MOCK_AUTH=guest pnpm mock`。

对接真实面板调试（代理转发 API 与 WebSocket）：

```bash
NEZHA_BACKEND=https://your-dashboard.example.com pnpm dev
```

构建：

```bash
pnpm build   # 产物在 dist/
```

---

## 🧩 技术栈

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · TanStack Query · Recharts · react-router · NumberFlow · simple-icons · Geist 字体

> 世界地图点阵数据由 `pnpm gen:map` 在构建期生成（基于 dotted-map），运行时为纯 SVG，零依赖。

## 📡 数据接口

| 接口 | 用途 |
| --- | --- |
| `WS /api/v1/ws/server` | 实时状态流 |
| `GET /api/v1/server-group` | 服务器分组 |
| `GET /api/v1/service` | 服务可用性 + 周期流量 |
| `GET /api/v1/server/{id}/service` | 单机 ping 监控 |
| `GET /api/v1/server/{id}/metrics` | TSDB 历史指标（v2） |
| `GET /api/v1/setting` | 站点配置 / 版本 / tsdb 开关 |

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 开源。

```
MIT License

Copyright (c) 2026 fl0w1nd

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🤝 友情链接

- [**Linux.do**](https://linux.do) — 真诚、友善、团结、专业，共建你我引以为荣之社区。
