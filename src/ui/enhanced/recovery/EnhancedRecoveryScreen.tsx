import { EnhancedAction } from "../components/EnhancedAction";
import { EnhancedAppBar } from "../components/EnhancedAppBar";
import { EnhancedStateSurface } from "../components/EnhancedStateSurface";

export type EnhancedRecoveryIssue =
  | {
      readonly reason: string;
      readonly status: "unavailable";
    }
  | {
      readonly quarantineKey: string | null;
      readonly reason: string;
      readonly status: "corrupt" | "unsupported";
    };

type EnhancedRecoveryScreenProps = {
  readonly onStartNew: () => void;
  readonly recovery: EnhancedRecoveryIssue;
};

/* Hallmark · genre: playful · macrostructure: Index-First · theme: custom (tuned) · design-system: design.md · designed-as-app */
export function EnhancedRecoveryScreen({
  onStartNew,
  recovery,
}: EnhancedRecoveryScreenProps) {
  const quarantineKey =
    recovery.status === "unavailable"
      ? null
      : recovery.quarantineKey;
  const description =
    recovery.status === "unavailable"
      ? "浏览器暂时无法访问本地存储。你仍可开始生涯，但这次进度可能无法保存。"
      : "这份存档已停止加载，原始数据没有被静默删除。你可以安全地开始一段新生涯。";

  return (
    <main
      className="min-h-dvh bg-enhanced-canvas text-enhanced-strong"
      data-hallmark-macrostructure="Index-First"
      id="main-content"
      tabIndex={-1}
    >
      <EnhancedAppBar
        context="Local recovery"
        currentLabel="恢复"
      />
      <div className="mx-auto w-full max-w-[var(--shell-max)] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <EnhancedStateSurface
          action={
            <EnhancedAction
              onClick={onStartNew}
              tone="primary"
            >
              开始新生涯
            </EnhancedAction>
          }
          description={description}
          detail={
            <div className="grid gap-2">
              <p>{recovery.reason}</p>
              {quarantineKey ? (
                <p className="break-all font-enhanced-mono text-xs text-enhanced-supporting">
                  隔离副本：{quarantineKey}
                </p>
              ) : null}
            </div>
          }
          eyebrow="Local recovery"
          state="recovery"
          title="本地存档需要处理"
        />
      </div>
    </main>
  );
}
