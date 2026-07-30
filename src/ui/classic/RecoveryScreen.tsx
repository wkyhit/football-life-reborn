type RecoveryIssue =
  | {
      readonly reason: string;
      readonly status: "unavailable";
    }
  | {
      readonly quarantineKey: string | null;
      readonly reason: string;
      readonly status: "corrupt" | "unsupported";
    };

type RecoveryScreenProps = {
  onStartNew: () => void;
  recovery: RecoveryIssue;
};

export function RecoveryScreen({
  onStartNew,
  recovery,
}: RecoveryScreenProps) {
  const quarantineKey =
    recovery.status === "unavailable"
      ? null
      : recovery.quarantineKey;

  return (
    <main
      className="flex min-h-dvh bg-canvas px-5 py-8 text-primary sm:items-center sm:py-12"
      id="main-content"
    >
      <section
        aria-labelledby="recovery-heading"
        className="mx-auto w-full max-w-lg self-start rounded-[16px] border border-line bg-surface p-5 shadow-[0_20px_60px_rgba(0,0,0,0.3)] sm:self-auto sm:p-7"
      >
        <p className="text-[11px] font-semibold tracking-[0.18em] text-accent">
          LOCAL RECOVERY
        </p>
        <h1
          className="mt-3 text-2xl font-black"
          id="recovery-heading"
        >
          本地存档需要处理
        </h1>
        <p className="mt-3 text-sm leading-6 text-secondary">
          {recovery.status === "unavailable"
            ? "浏览器暂时无法访问本地存储。你仍可开始生涯，但这次进度可能无法保存。"
            : "这份存档已停止加载，原始数据没有被静默删除。你可以安全地开始一段新生涯。"}
        </p>
        <p className="mt-4 rounded-[10px] bg-canvas px-3 py-3 text-xs leading-5 text-muted">
          {recovery.reason}
        </p>
        {quarantineKey ? (
          <p className="mt-4 break-all text-xs leading-5 text-muted">
            隔离副本：
            <code className="text-secondary">{quarantineKey}</code>
          </p>
        ) : null}
        <button
          className="mt-6 min-h-12 w-full rounded-[12px] bg-accent px-5 py-3 text-[15px] font-bold text-accent-ink transition-[transform,opacity] duration-150 ease-out active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
          onClick={onStartNew}
          type="button"
        >
          开始新生涯
        </button>
      </section>
    </main>
  );
}
