import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** 渲染异常兜底:白屏 → 可恢复的错误卡片 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[lotus] render error:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card mx-auto mt-10 flex max-w-md flex-col items-center gap-3 px-6 py-12 text-center">
          <p className="text-sm font-medium text-fg-2">页面渲染出错 / Render Error</p>
          <p className="break-all font-mono text-[11px] text-faint">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg-2 transition-colors hover:border-line-strong hover:text-fg"
          >
            重试 / Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
