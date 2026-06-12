import {
  siAlmalinux,
  siAlpinelinux,
  siApple,
  siArchlinux,
  siCentos,
  siDebian,
  siFedora,
  siFreebsd,
  siLinux,
  siOpensuse,
  siRockylinux,
  siUbuntu,
} from "simple-icons";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, { path: string; hex: string }> = {
  ubuntu: siUbuntu,
  debian: siDebian,
  centos: siCentos,
  almalinux: siAlmalinux,
  rocky: siRockylinux,
  rockylinux: siRockylinux,
  alpine: siAlpinelinux,
  arch: siArchlinux,
  archlinux: siArchlinux,
  fedora: siFedora,
  freebsd: siFreebsd,
  opensuse: siOpensuse,
  suse: siOpensuse,
  darwin: siApple,
  macos: siApple,
  linux: siLinux,
};

/* simple-icons 已移除 Windows 品牌图标,手绘经典四格旗 */
const WINDOWS_PATH =
  "M0 3.45 9.75 2.1v9.45H0Zm10.95-1.5L24 0v11.55H10.95ZM0 12.45h9.75v9.45L0 20.55Zm10.95 0H24V24l-13.05-1.95Z";

export function OsIcon({ platform, className }: { platform?: string; className?: string }) {
  const key = (platform ?? "").toLowerCase();

  let path: string | null = null;
  let hex: string | null = null;
  if (key.includes("windows")) {
    path = WINDOWS_PATH;
    hex = "0078D4";
  } else {
    for (const [name, icon] of Object.entries(ICON_MAP)) {
      if (key.includes(name)) {
        path = icon.path;
        hex = icon.hex;
        break;
      }
    }
  }
  // 未识别的 Linux 发行版回退到 Tux
  if (!path && key) {
    path = siLinux.path;
    hex = siLinux.hex;
  }
  if (!path) return null;

  return (
    <svg viewBox="0 0 24 24" className={cn("size-3.5 shrink-0", className)} aria-hidden>
      <path d={path} fill={`#${hex}`} />
    </svg>
  );
}
