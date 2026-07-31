import {
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";

import { EnhancedAction } from "./EnhancedAction";

export type EnhancedSurfaceState =
  | "empty"
  | "loading"
  | "error"
  | "recovery"
  | "install"
  | "success";

type EnhancedStateSurfaceProps = {
  readonly action?: ReactNode;
  readonly compact?: boolean;
  readonly description: string;
  readonly detail?: ReactNode;
  readonly eyebrow: string;
  readonly state: EnhancedSurfaceState;
  readonly title: string;
};

type BeforeInstallPromptEvent = Event & {
  readonly userChoice: Promise<{
    readonly outcome: "accepted" | "dismissed";
  }>;
  prompt: () => Promise<void>;
};

type InstallStatus =
  | "available"
  | "error"
  | "guidance"
  | "installed"
  | "prompting";

const MARKER_CLASS: Readonly<
  Record<EnhancedSurfaceState, string>
> = {
  empty: "bg-enhanced-neutral",
  error: "bg-enhanced-alert",
  install: "bg-enhanced-focus",
  loading:
    "bg-enhanced-pitch motion-safe:animate-[enhanced-state-pulse_var(--dur-long)_var(--ease-in-out)_infinite]",
  recovery: "bg-enhanced-trophy",
  success: "bg-enhanced-success",
};

export function EnhancedStateSurface({
  action,
  compact = false,
  description,
  detail,
  eyebrow,
  state,
  title,
}: EnhancedStateSurfaceProps) {
  const headingId = useId();
  const statusRole =
    state === "error"
      ? "alert"
      : state === "loading"
        ? "status"
        : undefined;

  return (
    <section
      aria-busy={state === "loading"}
      aria-labelledby={headingId}
      className={[
        "border-y border-enhanced-line",
        compact
          ? "grid gap-3 py-4"
          : "grid gap-5 py-8 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,0.55fr)] sm:items-end",
      ].join(" ")}
      data-enhanced-state={state}
      role={statusRole}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-enhanced-mono text-xs uppercase tracking-[0.08em] text-enhanced-supporting">
          <span
            aria-hidden="true"
            className={[
              "h-2 w-2 shrink-0",
              MARKER_CLASS[state],
            ].join(" ")}
          />
          {eyebrow}
        </p>
        <h2
          className="mt-2 [overflow-wrap:anywhere] text-lg font-bold leading-tight text-enhanced-strong"
          id={headingId}
        >
          {title}
        </h2>
        <p className="mt-2 max-w-[65ch] text-base leading-relaxed text-enhanced-supporting">
          {description}
        </p>
      </div>
      {detail || action ? (
        <div className="grid min-w-0 gap-3 sm:justify-items-end">
          {detail ? (
            <div className="max-w-full text-sm leading-relaxed text-enhanced-ink-2">
              {detail}
            </div>
          ) : null}
          {action}
        </div>
      ) : null}
    </section>
  );
}

export function EnhancedInstallSurface() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [status, setStatus] = useState<InstallStatus>(() =>
    isStandaloneDisplay() ? "installed" : "guidance",
  );

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setStatus("available");
    };
    const onInstalled = () => {
      setPromptEvent(null);
      setStatus("installed");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        onPrompt,
      );
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const requestInstall = async () => {
    if (promptEvent === null) {
      return;
    }

    setStatus("prompting");

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;

      setPromptEvent(null);
      setStatus(
        choice.outcome === "accepted"
          ? "installed"
          : "guidance",
      );
    } catch {
      setStatus("error");
    }
  };

  return (
    <EnhancedStateSurface
      action={
        promptEvent === null ? null : (
          <EnhancedAction
            onClick={() => void requestInstall()}
            state={
              status === "prompting" ? "loading" : "default"
            }
            tone="primary"
          >
            安装到设备
          </EnhancedAction>
        )
      }
      compact
      description={installDescription(status)}
      eyebrow="Install"
      state={status === "error" ? "error" : "install"}
      title="安装到设备"
    />
  );
}

function installDescription(status: InstallStatus): string {
  if (status === "installed") {
    return "已安装。之后可以直接从设备主屏幕打开，存档仍只保存在本机。";
  }

  if (status === "error") {
    return "安装请求没有完成。请稍后重试，或使用浏览器菜单添加到主屏幕。";
  }

  if (status === "available" || status === "prompting") {
    return "当前浏览器支持安装；安装不会上传存档或添加分析服务。";
  }

  return "可用时这里会出现原生安装操作；也可以使用浏览器菜单添加到主屏幕。";
}

function isStandaloneDisplay(): boolean {
  const standaloneNavigator = navigator as Navigator & {
    readonly standalone?: boolean;
  };

  return (
    standaloneNavigator.standalone === true ||
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches)
  );
}
