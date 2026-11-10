import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: ReactNode;
  /** 图标类选项的无障碍名称,同时作为悬停提示 */
  title?: string;
  disabled?: boolean;
}

interface SegmentedProps<T extends string | number> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 控件组的无障碍名称 */
  label: string;
  /** md:工具栏 32px 高;sm:图表工具栏的紧凑尺寸 */
  size?: "sm" | "md";
  /** 选项是否等宽的图标按钮 */
  iconOnly?: boolean;
  className?: string;
  itemClassName?: string;
}

/**
 * 统一的分段选择器(单选):
 * - 外观:只有轨道带轮廓,选中项是一块在选项间滑动的抬高底色,不再叠加边框
 * - 语义:radiogroup / radio + aria-checked
 * - 键盘:方向键在选项间移动并选中,Home/End 跳到首尾,Tab 离开控件组
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = "md",
  iconOnly = false,
  className,
  itemClassName,
}: SegmentedProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<T, HTMLButtonElement>());
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  // 首次定位不做过渡,避免滑块从左上角"飞"过来
  const [animate, setAnimate] = useState(false);

  const measure = useCallback(() => {
    const el = itemRefs.current.get(value);
    if (!el) {
      setThumb(null);
      return;
    }
    setThumb((prev) =>
      prev && prev.left === el.offsetLeft && prev.width === el.offsetWidth
        ? prev
        : { left: el.offsetLeft, width: el.offsetWidth },
    );
  }, [value]);

  // 选项文字、数量或语言变化都会改变宽度,每次渲染后重新测量(值未变时不触发更新)
  useLayoutEffect(measure);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    for (const el of itemRefs.current.values()) ro.observe(el);
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => {
      ro.disconnect();
      cancelAnimationFrame(id);
    };
  }, [measure]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const enabled = options.filter((o) => !o.disabled);
    if (enabled.length === 0) return;
    const current = enabled.findIndex((o) => o.value === value);
    let next: number;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (current + 1) % enabled.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (current - 1 + enabled.length) % enabled.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = enabled.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const target = enabled[next];
    onChange(target.value);
    const el = itemRefs.current.get(target.value);
    el?.focus();
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const hasSelection = options.some((o) => o.value === value);

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "relative inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-inset p-0.5",
        size === "md" && "h-8",
        className,
      )}
    >
      {thumb && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0.5 left-0 rounded-[6px] bg-surface shadow-xs dark:bg-surface-2",
            animate &&
              "transition-[transform,width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
          )}
          style={{ width: thumb.width, transform: `translateX(${thumb.left}px)` }}
        />
      )}
      {options.map((o, i) => {
        const active = o.value === value;
        // 没有选中项时让第一个可用项可聚焦,保证 Tab 能进入控件组
        const tabbable = active || (!hasSelection && i === options.findIndex((x) => !x.disabled));
        return (
          // biome-ignore lint/a11y/useSemanticElements: 按 WAI-ARIA 单选组模式用 button 实现,原生 radio 无法承载图标与滑块样式
          <button
            key={o.value}
            ref={(el) => {
              if (el) itemRefs.current.set(o.value, el);
              else itemRefs.current.delete(o.value);
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={iconOnly ? o.title : undefined}
            title={o.title}
            disabled={o.disabled}
            tabIndex={tabbable ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-10 flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] font-medium transition-colors",
              size === "md" ? "h-full text-xs" : "py-1 text-[11px]",
              iconOnly ? "w-7" : size === "md" ? "px-2.5" : "px-2",
              active ? "text-fg" : "text-muted hover:text-fg-2",
              o.disabled && "cursor-not-allowed text-faint opacity-45 hover:text-faint",
              itemClassName,
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
