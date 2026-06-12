/**
 * 本地 mock 哪吒 v2 后端:REST + WebSocket
 * 用法:node mock/server.mjs  (默认端口 8008)
 * 认证模式:默认管理员态; 游客态 MOCK_AUTH=guest node mock/server.mjs
 */
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 8008;
const MOCK_AUTH = process.env.MOCK_AUTH ?? "admin";
const MOCK_AUTH_GUEST_VALUES = new Set(["0", "false", "guest"]);
const MOCK_AUTH_DEFAULT_ADMIN = MOCK_AUTH_GUEST_VALUES.has(MOCK_AUTH.toLowerCase()) === false;

/* ---------- 模拟服务器数据 ---------- */

// 动态生成各紧迫度层级的到期日 (基于当前日期偏移)
function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().replace("Z", "+08:00");
}

const SPECS = [
  {
    name: "Tokyo-Core",
    cc: "jp",
    platform: "ubuntu",
    pv: "24.04",
    arch: "amd64",
    virt: "kvm",
    cpu: "AMD EPYC 9354P 4 Virtual Core",
    mem: 8,
    disk: 160,
    temps: ["coretemp", "nvme"],
    note: {
      billingDataMod: {
        startDate: "2025-09-01T00:00:00+08:00",
        endDate: "2026-09-01T00:00:00+08:00",
        autoRenewal: "1",
        cycle: "年",
        amount: "$96",
      },
      planDataMod: {
        bandwidth: "10Gbps",
        trafficVol: "4TB/月",
        trafficType: "2",
        IPv4: "1",
        IPv6: "1",
        networkRoute: "IIJ",
        extra: "",
      },
    },
  },
  {
    name: "Osaka-Edge",
    cc: "jp",
    platform: "debian",
    pv: "12",
    arch: "arm64",
    virt: "kvm",
    cpu: "Ampere Altra 2 Virtual Core",
    mem: 4,
    disk: 80,
    // ≤3 天: 红色快速脉冲
    note: {
      billingDataMod: { endDate: dateOffset(2), cycle: "月", amount: "$18" },
      planDataMod: { bandwidth: "1Gbps", trafficVol: "1TB/月", IPv4: "1", networkRoute: "IIJ" },
    },
  },
  {
    name: "HongKong-Pro",
    cc: "hk",
    platform: "debian",
    pv: "13",
    arch: "amd64",
    virt: "kvm",
    cpu: "Intel Xeon Platinum 8474C 8 Virtual Core",
    mem: 16,
    disk: 320,
    temps: ["coretemp", "nvme"],
    // ≤7 天: 黄色柔和脉冲
    note: {
      billingDataMod: { endDate: dateOffset(5), cycle: "月", amount: "$28" },
      planDataMod: {
        bandwidth: "1Gbps",
        trafficVol: "2TB/月",
        IPv4: "1",
        IPv6: "1",
        networkRoute: "CN2 GIA",
      },
    },
  },
  {
    name: "Singapore-01",
    cc: "sg",
    platform: "ubuntu",
    pv: "22.04",
    arch: "amd64",
    virt: "lxc",
    cpu: "Intel Xeon Gold 6433N 2 Virtual Core",
    mem: 4,
    disk: 60,
    // ≤14 天: 黄色静态
    note: {
      billingDataMod: { endDate: dateOffset(10), cycle: "季", amount: "$35" },
      planDataMod: { bandwidth: "500Mbps", trafficVol: "500GB/月", IPv4: "1" },
    },
  },
  {
    name: "LosAngeles-4837",
    cc: "us",
    platform: "almalinux",
    pv: "9.4",
    arch: "amd64",
    virt: "kvm",
    cpu: "AMD EPYC 7763 4 Virtual Core",
    mem: 8,
    disk: 120,
    // ≤30 天: 灰色 muted
    note: {
      billingDataMod: { endDate: dateOffset(22), cycle: "月", amount: "$45" },
      planDataMod: {
        bandwidth: "2.5Gbps",
        trafficVol: "20TB/月",
        IPv4: "1",
        IPv6: "1",
        networkRoute: "4837",
      },
    },
  },
  {
    name: "SanJose-GIA",
    cc: "us",
    platform: "debian",
    pv: "12",
    arch: "amd64",
    virt: "",
    cpu: "Intel Core i9-13900K 2 Core",
    mem: 2,
    disk: 40,
    temps: ["coretemp"],
    // 已到期: 红色快速脉冲
    note: {
      billingDataMod: { endDate: dateOffset(-3), cycle: "月", amount: "$12" },
      planDataMod: { bandwidth: "100Mbps", trafficVol: "500GB/月", IPv4: "1" },
    },
  },
  {
    name: "Frankfurt-DC",
    cc: "de",
    platform: "ubuntu",
    pv: "24.04",
    arch: "amd64",
    virt: "",
    cpu: "AMD EPYC 9654 6 Virtual Core",
    mem: 12,
    disk: 240,
    gpu: ["NVIDIA GeForce RTX 4090", "NVIDIA GeForce RTX 4090"],
    temps: ["coretemp", "nvme", "gpu"],
    note: null,
  },
  {
    name: "London-Lite",
    cc: "gb",
    platform: "alpine",
    pv: "3.20",
    arch: "arm64",
    virt: "docker",
    cpu: "Neoverse-N1 1 Virtual Core",
    mem: 1,
    disk: 20,
    // >30 天: 灰色 faint
    note: {
      billingDataMod: { endDate: dateOffset(90), cycle: "月", amount: "0" },
      planDataMod: { bandwidth: "200Mbps", trafficVol: "1TB/月", IPv6: "1" },
    },
  },
  {
    name: "Seoul-Premium",
    cc: "kr",
    platform: "rocky",
    pv: "9.5",
    arch: "amd64",
    virt: "kvm",
    cpu: "Intel Xeon Silver 4516Y+ 4 Virtual Core",
    mem: 8,
    disk: 100,
    note: null,
  },
  {
    name: "Taipei-Hinet",
    cc: "tw",
    platform: "freebsd",
    pv: "14.1",
    arch: "amd64",
    virt: "",
    cpu: "Intel N305 4 Core",
    mem: 16,
    disk: 512,
    note: null,
  },
  {
    name: "Sydney-Backup",
    cc: "au",
    platform: "windows",
    pv: "Server 2022",
    arch: "amd64",
    virt: "hyper-v",
    cpu: "AMD Ryzen 9 7950X 8 Virtual Core",
    mem: 32,
    disk: 1000,
    gpu: ["NVIDIA RTX A4000"],
    temps: ["cpu"],
    note: null,
  },
  {
    name: "Moscow-Cold",
    cc: "ru",
    platform: "centos",
    pv: "7.9",
    arch: "amd64",
    virt: "kvm",
    cpu: "Intel Xeon E5-2680 v4 2 Virtual Core",
    mem: 4,
    disk: 80,
    note: null,
  },
];

const GIB = 1024 ** 3;
const now0 = Date.now();

const servers = SPECS.map((s, i) => {
  const seed = i + 1;
  return {
    id: seed,
    spec: s,
    offline: i === 11, // 最后一台离线
    cpu: 8 + Math.random() * 30,
    memPct: 25 + Math.random() * 45,
    diskPct: 20 + Math.random() * 55,
    up: (50 + Math.random() * 800) * 1024 ** 2,
    down: (100 + Math.random() * 1500) * 1024 ** 2,
    tin: Math.random() * 800 * GIB,
    tout: Math.random() * 400 * GIB,
    boot: Math.floor(now0 / 1000) - Math.floor((3 + Math.random() * 200) * 86400),
    tcp: 40 + Math.floor(Math.random() * 300),
    udp: 5 + Math.floor(Math.random() * 60),
    procs: 60 + Math.floor(Math.random() * 200),
    load: 0.1 + Math.random() * 1.2,
    temp: 42 + Math.random() * 18,
    gpuUtil: (s.gpu ?? []).map(() => 10 + Math.random() * 60),
  };
});

function drift(v, min, max, step) {
  const next = v + (Math.random() - 0.5) * step;
  return Math.max(min, Math.min(max, next));
}

function tick() {
  for (const s of servers) {
    s.cpu = drift(s.cpu, 0.5, 99, 9);
    s.memPct = drift(s.memPct, 8, 96, 1.6);
    s.up = Math.min(
      2048 * 1024 ** 2,
      Math.max(10 * 1024 ** 2, s.up * (0.75 + Math.random() * 0.55)),
    );
    s.down = Math.min(
      4096 * 1024 ** 2,
      Math.max(20 * 1024 ** 2, s.down * (0.75 + Math.random() * 0.55)),
    );
    s.tin += s.down * 2;
    s.tout += s.up * 2;
    s.tcp = Math.round(drift(s.tcp, 10, 900, 26));
    s.udp = Math.round(drift(s.udp, 2, 200, 8));
    s.load = drift(s.load, 0.02, 8, 0.3);
    s.temp = drift(s.temp, 35, 88, 2.2);
    s.gpuUtil = s.gpuUtil.map((g) => drift(g, 1, 99, 7));
  }
}

function temperatures(s) {
  const kinds = s.spec.temps ?? [];
  const list = [];
  for (const k of kinds) {
    if (k === "coretemp" || k === "cpu") {
      list.push({ Name: "coretemp_package_id_0", Temperature: s.temp });
    } else if (k === "nvme") {
      list.push({ Name: "nvme_composite", Temperature: s.temp - 8 + Math.random() * 4 });
    } else if (k === "gpu") {
      list.push({ Name: "gpu_edge", Temperature: s.temp + 6 + Math.random() * 6 });
    }
  }
  return list;
}

/** 模拟后端 json omitempty:零值/空值字段从 JSON 中剥除 */
function omitempty(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === 0 || v === "" || v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** 与真实后端一致:public_note 仅在连接的第一帧下发 */
function snapshot(withPublicNote = false) {
  const now = Date.now();
  return {
    now,
    servers: servers.map((s) => ({
      id: s.id,
      name: s.spec.name,
      public_note: withPublicNote && s.spec.note ? JSON.stringify(s.spec.note) : "",
      last_active: s.offline
        ? new Date(now - 86400_000 * 3).toISOString()
        : new Date(now).toISOString(),
      country_code: s.spec.cc,
      host: omitempty({
        platform: s.spec.platform,
        platform_version: s.spec.pv,
        cpu: [s.spec.cpu],
        gpu: s.spec.gpu ?? [],
        mem_total: s.spec.mem * GIB,
        disk_total: s.spec.disk * GIB,
        swap_total: Math.round(s.spec.mem / 2) * GIB,
        arch: s.spec.arch,
        virtualization: s.spec.virt || undefined,
        boot_time: s.boot,
        version: "1.15.0",
      }),
      state: omitempty({
        cpu: s.offline ? 0 : s.cpu,
        mem_used: s.offline ? 0 : (s.memPct / 100) * s.spec.mem * GIB,
        swap_used: s.offline ? 0 : 0.12 * Math.round(s.spec.mem / 2) * GIB,
        disk_used: (s.diskPct / 100) * s.spec.disk * GIB,
        net_in_transfer: s.tin,
        net_out_transfer: s.tout,
        net_in_speed: s.offline ? 0 : s.down,
        net_out_speed: s.offline ? 0 : s.up,
        uptime: s.offline ? 0 : Math.floor(Date.now() / 1000) - s.boot,
        load_1: s.offline ? 0 : s.load,
        load_5: s.offline ? 0 : s.load * 0.9,
        load_15: s.offline ? 0 : s.load * 0.8,
        tcp_conn_count: s.offline ? 0 : s.tcp,
        udp_conn_count: s.offline ? 0 : s.udp,
        process_count: s.offline ? 0 : s.procs,
        temperatures: s.offline ? [] : temperatures(s),
        gpu: s.offline ? [] : s.gpuUtil,
      }),
    })),
  };
}

/* ---------- REST ---------- */

const MONITORS = ["电信 CT", "联通 CU", "移动 CM", "Cloudflare"];

const MONITOR_PERIOD_HOURS = { "1d": 24, "7d": 168, "30d": 720 };
const MONITOR_PERIOD_POINTS = { "1d": 180, "7d": 336, "30d": 360 };

function monitorData(serverId, period = "1d") {
  const hours = MONITOR_PERIOD_HOURS[period] ?? 24;
  const points = MONITOR_PERIOD_POINTS[period] ?? 180;
  const step = (hours * 3600 * 1000) / points;
  const start = Date.now() - hours * 3600 * 1000;
  // 故障/抖动窗口以 180 点为基准定义, 其他区间按比例缩放
  const f = points / 180;
  return MONITORS.map((name, mi) => {
    const base = 35 + mi * 40 + (serverId % 5) * 12;
    const created_at = [];
    const avg_delay = [];
    for (let i = 0; i < points; i++) {
      created_at.push(Math.round(start + i * step));
      const wave = Math.sin((i / points) * Math.PI * 4 + mi) * 14;

      // 根据线路(mi)判断当前 i 是否属于故障/网络恶化区间
      let isInMajorFailure = false; // 严重故障段，直接丢包/超时
      let isInJitterPeriod = false; // 轻微抖动/恶化段，高延迟

      if (mi === 0) {
        // 电信 CT
        if (i >= 45 * f && i <= 52 * f) isInMajorFailure = true;
        if (i >= 130 * f && i <= 138 * f) isInJitterPeriod = true;
      } else if (mi === 1) {
        // 联通 CU
        if (i >= 75 * f && i <= 80 * f) isInMajorFailure = true;
        if (i >= 150 * f && i <= 158 * f) isInJitterPeriod = true;
      } else if (mi === 2) {
        // 移动 CM
        if (i >= 100 * f && i <= 112 * f) isInMajorFailure = true;
        if (i >= 20 * f && i <= 30 * f) isInJitterPeriod = true;
      } else if (mi === 3) {
        // Cloudflare
        if (i >= 115 * f && i <= 122 * f) isInMajorFailure = true;
        if (i >= 60 * f && i <= 68 * f) isInJitterPeriod = true;
      }

      if (isInMajorFailure) {
        // 严重故障：60% 概率直接超时(0)，40% 概率极高延迟(3500ms~6000ms)
        if (Math.random() < 0.6) {
          avg_delay.push(0);
        } else {
          avg_delay.push(3500 + Math.random() * 2500);
        }
      } else if (isInJitterPeriod) {
        // 网络抖动期：延迟增高，且有 15% 的偶发丢包
        if (Math.random() < 0.15) {
          avg_delay.push(0);
        } else {
          avg_delay.push(base + wave + (Math.random() - 0.5) * 180 + 300);
        }
      } else {
        // 正常时期：偶尔有极小概率的偶发超时(如移动 2%，其他 0.5%)
        const normalLossRate = mi === 2 ? 0.02 : 0.005;
        if (Math.random() < normalLossRate) {
          avg_delay.push(0);
        } else {
          const jitter = (Math.random() - 0.5) * 16;
          avg_delay.push(Math.max(4, base + wave + jitter));
        }
      }
    }
    return {
      monitor_id: mi + 1,
      monitor_name: name,
      server_id: serverId,
      server_name: SPECS[serverId - 1]?.name ?? "",
      created_at,
      avg_delay,
    };
  });
}

function metricsData(serverId, metric, period) {
  const hours = period === "30d" ? 720 : period === "7d" ? 168 : 24;
  const points = period === "1d" ? 288 : period === "7d" ? 336 : 360;
  const step = (hours * 3600 * 1000) / points;
  const start = Date.now() - hours * 3600 * 1000;
  const isSpeed = metric.includes("speed");
  const data_points = [];
  for (let i = 0; i < points; i++) {
    const phase = Math.sin((i / points) * Math.PI * 6) * 0.4 + 0.5;
    let value;
    if (isSpeed) {
      value = phase * 800 * 1024 ** 2 * (0.4 + Math.random());
    } else if (metric === "load1") {
      value = Math.max(0.02, phase * 2.4 + (Math.random() - 0.5) * 0.6);
    } else if (metric === "process_count") {
      value = Math.round(120 + phase * 90 + (Math.random() - 0.5) * 30);
    } else if (metric === "tcp_conn") {
      value = Math.round(80 + phase * 400 + (Math.random() - 0.5) * 90);
    } else {
      value = Math.min(98, Math.max(1, phase * 70 + (Math.random() - 0.5) * 18));
    }
    data_points.push({ ts: Math.round(start + i * step), value });
  }
  return {
    server_id: serverId,
    server_name: SPECS[serverId - 1]?.name ?? "",
    metric,
    data_points,
  };
}

function serviceData() {
  const services = {};
  ["Google", "GitHub", "Cloudflare", "OpenAI API"].forEach((name, i) => {
    const up = [];
    const down = [];
    const delay = [];
    for (let d = 0; d < 30; d++) {
      const bad = Math.random() < 0.06;
      const total = 1440;
      const downCount = bad ? Math.floor(Math.random() * 120) : Math.floor(Math.random() * 4);
      up.push(total - downCount);
      down.push(downCount);
      delay.push(30 + i * 25 + Math.random() * 40);
    }
    services[i + 1] = {
      service_name: name,
      current_up: up.at(-1),
      current_down: down.at(-1),
      total_up: up.reduce((a, b) => a + b, 0),
      total_down: down.reduce((a, b) => a + b, 0),
      delay,
      up,
      down,
    };
  });

  const cycle_transfer_stats = {
    1: {
      name: "HK 月付流量",
      from: "2026-06-01T00:00:00+08:00",
      to: "2026-07-01T00:00:00+08:00",
      max: 2 * 1024 ** 4,
      server_name: { 3: "HongKong-Pro" },
      transfer: { 3: servers[2].tin % (2 * 1024 ** 4) },
      next_update: { 3: new Date(Date.now() + 3600_000).toISOString() },
    },
    2: {
      name: "LA 4837 月度",
      from: "2026-06-01T00:00:00+08:00",
      to: "2026-07-01T00:00:00+08:00",
      max: 20 * 1024 ** 4,
      server_name: { 5: "LosAngeles-4837" },
      transfer: { 5: (servers[4].tin + servers[4].tout) % (20 * 1024 ** 4) },
      next_update: { 5: new Date(Date.now() + 3600_000).toISOString() },
    },
  };

  return { services, cycle_transfer_stats };
}

/* ---------- HTTP / WS ---------- */

const json = (res, data) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ success: true, data }));
};

const unauthorized = (res) => {
  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ success: false, error: "unauthorized" }));
};

/** 模拟登录态:默认管理员态; 游客态仍可用 nz-jwt cookie 临时登录 */
const isAuthed = (req) => MOCK_AUTH_DEFAULT_ADMIN || (req.headers.cookie ?? "").includes("nz-jwt=");

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname;

  if (p === "/api/v1/setting") {
    return json(res, {
      config: { language: "zh-CN", site_name: "Lotus Monitoring", custom_code: "" },
      version: "2.0.7",
      tsdb_enabled: true,
    });
  }
  if (p === "/api/v1/server-group") {
    return json(res, [
      {
        group: { id: 1, created_at: "", updated_at: "", name: "亚太" },
        servers: [1, 2, 3, 4, 9, 10],
      },
      { group: { id: 2, created_at: "", updated_at: "", name: "北美" }, servers: [5, 6] },
      { group: { id: 3, created_at: "", updated_at: "", name: "欧洲" }, servers: [7, 8, 12] },
    ]);
  }
  if (p === "/api/v1/service") return json(res, serviceData());
  if (p === "/api/v1/profile") {
    if (!isAuthed(req)) return unauthorized(res);
    return json(res, { id: 1, username: "admin", role: 0 });
  }

  let m = p.match(/^\/api\/v1\/server\/(\d+)\/service$/);
  if (m) {
    const period = url.searchParams.get("period") ?? "1d";
    // 与真实后端一致: 1d 之外的区间需要登录
    if (period !== "1d" && !isAuthed(req)) return unauthorized(res);
    return json(res, monitorData(Number(m[1]), period));
  }

  m = p.match(/^\/api\/v1\/server\/(\d+)\/metrics$/);
  if (m) {
    return json(
      res,
      metricsData(
        Number(m[1]),
        url.searchParams.get("metric") ?? "cpu",
        url.searchParams.get("period") ?? "1d",
      ),
    );
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ success: false, error: "not found" }));
});

const wss = new WebSocketServer({ server, path: "/api/v1/ws/server" });

wss.on("connection", (socket) => {
  socket.send(JSON.stringify(snapshot(true)));
});

setInterval(() => {
  tick();
  const payload = JSON.stringify(snapshot());
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(payload);
  }
}, 2000);

server.listen(PORT, () => {
  console.log(
    `[mock] nezha v2 backend at http://localhost:${PORT} auth=${
      MOCK_AUTH_DEFAULT_ADMIN ? "admin" : "guest"
    }`,
  );
});
