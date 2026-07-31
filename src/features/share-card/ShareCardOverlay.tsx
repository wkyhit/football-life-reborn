import {
  useEffect,
  useRef,
  useState,
} from "react";

import type { SummaryPresentation } from "../../ui/classic/summaryPresentation";
import { EnhancedAction } from "../../ui/enhanced/components/EnhancedAction";
import { Dialog } from "../../ui/shared/Dialog";
import {
  shareCardFilename,
  type ShareCardChallenge,
} from "./shareCardContract";

type ShareCardOverlayProps = {
  readonly challenge?: ShareCardChallenge;
  readonly onClose: () => void;
  readonly qrPayload: string;
  readonly variant?: "classic" | "enhanced";
  readonly view: SummaryPresentation;
};

export function ShareCardOverlay({
  challenge,
  onClose,
  qrPayload,
  variant = "classic",
  view,
}: ShareCardOverlayProps) {
  const [displayName, setDisplayName] = useState(
    view.identity.name,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    null,
  );
  const [previewName, setPreviewName] = useState(
    view.identity.name,
  );
  const [renderError, setRenderError] = useState(false);
  const liveUrl = useRef<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setRenderError(false);

    void import("./shareCard")
      .then(({ createShareCardBlob }) =>
        createShareCardBlob({
          ...(challenge === undefined ? {} : { challenge }),
          displayName,
          qrPayload,
          view,
        }),
      )
      .then((blob) => {
        const nextUrl = URL.createObjectURL(blob);

        if (cancelled) {
          URL.revokeObjectURL(nextUrl);
          return;
        }

        if (liveUrl.current !== null) {
          URL.revokeObjectURL(liveUrl.current);
        }

        liveUrl.current = nextUrl;
        setPreviewName(displayName);
        setPreviewUrl(nextUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setRenderError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [challenge, displayName, qrPayload, view]);

  useEffect(
    () => () => {
      if (liveUrl.current !== null) {
        URL.revokeObjectURL(liveUrl.current);
      }
    },
    [],
  );

  const download = () => {
    if (previewUrl === null) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = previewUrl;
    anchor.download = shareCardFilename(
      displayName,
      view,
      challenge,
    );
    anchor.click();
  };

  if (variant === "classic") {
    return (
      <Dialog
        className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm"
        data-classic-share-overlay=""
        initialFocusRef={nameInputRef}
        labelledBy="share-card-title"
        onClose={onClose}
      >
        <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-6">
          <h2 className="sr-only" id="share-card-title">
            生涯战绩卡
          </h2>
          {challenge ? (
            <p className="mb-3 text-center text-[12px] font-extrabold text-emerald-300">
              {challenge.title} · {challenge.calendarDate}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <label
              className="shrink-0 text-[12px] font-bold text-zinc-400"
              htmlFor="share-card-name"
            >
              卡上名字
            </label>
            <input
              className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-[10px] text-[14px] font-bold text-zinc-100 outline-none focus:border-emerald-500"
              id="share-card-name"
              maxLength={12}
              onChange={(event) =>
                setDisplayName(event.currentTarget.value)
              }
              placeholder="给自己起个名字"
              ref={nameInputRef}
              value={displayName}
            />
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
            {previewUrl === null ? (
              <div className="mx-auto flex aspect-[1080/1720] w-full max-w-sm items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-[13px] font-bold text-zinc-400">
                {renderError ? "生成失败，请重试" : "正在生成…"}
              </div>
            ) : (
              <img
                alt="生涯战绩卡"
                className="mx-auto w-full max-w-sm rounded-xl border border-zinc-800"
                data-share-card-name={previewName}
                src={previewUrl}
              />
            )}
          </div>

          <p className="mt-3 text-center text-[14px] font-bold text-amber-300">
            长按图片保存，或下载后发给朋友
          </p>
          <div className="mt-[10px] grid shrink-0 grid-cols-2 gap-2">
            <button
              className="h-12 rounded-xl border border-zinc-700 px-5 text-[15px] text-zinc-100 transition-colors active:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
              onClick={onClose}
              type="button"
            >
              关闭
            </button>
            <button
              className="h-12 rounded-xl bg-emerald-500 px-5 text-[15px] font-bold text-zinc-950 transition-colors active:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
              disabled={previewUrl === null}
              onClick={download}
              type="button"
            >
              下载图片
            </button>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      className="fixed inset-0 z-50 flex min-w-0 flex-col bg-enhanced-canvas text-enhanced-strong"
      data-enhanced-share-overlay=""
      data-hallmark-macrostructure="Index-First"
      initialFocusRef={nameInputRef}
      labelledBy="share-card-title"
      onClose={onClose}
      variant="enhanced"
    >
      {/* Hallmark · genre: playful · macrostructure: Index-First · theme: custom (tuned) · design-system: design.md · designed-as-app */}
      <header className="shrink-0 border-b-2 border-enhanced-line">
        <div className="mx-auto flex min-h-16 w-full max-w-[var(--shell-max)] items-center gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <div className="min-w-0 flex-1">
            <p className="font-enhanced-mono text-xs uppercase tracking-[0.08em] text-enhanced-supporting">
              Export record
            </p>
            <h2
              className="mt-1 truncate font-enhanced-display text-2xl font-bold"
              id="share-card-title"
            >
              生涯战绩卡
            </h2>
          </div>
          <EnhancedAction onClick={onClose}>关闭</EnhancedAction>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto grid w-full max-w-[var(--shell-max)] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1fr)] lg:px-8">
          <section className="min-w-0 border-y border-enhanced-line py-5">
            <p className="font-enhanced-mono text-xs uppercase tracking-[0.08em] text-enhanced-pitch">
              Share / 01
            </p>
            <h3 className="mt-2 text-2xl font-bold">
              为这份记录署名
            </h3>
            <p className="mt-2 text-base leading-relaxed text-enhanced-supporting">
              图片只在本机生成。修改署名会立即重制预览，不会改动生涯存档。
            </p>
            {challenge ? (
              <p className="mt-5 border-l-2 border-enhanced-pitch pl-3 text-sm font-bold text-enhanced-ink-2">
                {challenge.title} · {challenge.calendarDate}
              </p>
            ) : null}
            <label
              className="mt-6 block text-sm font-bold text-enhanced-ink-2"
              htmlFor="share-card-name"
            >
              卡上名字
              <input
                className="mt-2 min-h-11 w-full border border-enhanced-line bg-enhanced-surface px-3 text-base font-bold text-enhanced-strong outline-none focus-visible:border-enhanced-focus focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-enhanced-focus"
                data-enhanced-field=""
                data-field-state="default"
                id="share-card-name"
                maxLength={12}
                onChange={(event) =>
                  setDisplayName(event.currentTarget.value)
                }
                placeholder="给自己起个名字"
                ref={nameInputRef}
                value={displayName}
              />
            </label>
            <p className="mt-4 text-sm leading-relaxed text-enhanced-trophy">
              长按图片保存，或下载后发给朋友。
            </p>
            <EnhancedAction
              className="mt-5 w-full sm:w-auto"
              disabled={previewUrl === null}
              disabledReason={
                renderError
                  ? "战绩卡生成失败，请修改署名或关闭后重试"
                  : "战绩卡生成完成后才能下载"
              }
              onClick={download}
              state={
                renderError
                  ? "error"
                  : previewUrl === null
                    ? "loading"
                    : "default"
              }
              tone="primary"
            >
              下载图片
            </EnhancedAction>
          </section>

          <section
            aria-label="战绩卡预览"
            className="min-w-0 border-b border-enhanced-line pb-6"
          >
            <p className="mb-3 font-enhanced-mono text-xs uppercase tracking-[0.08em] text-enhanced-supporting">
              Live preview
            </p>
            {previewUrl === null ? (
              <div
                aria-live="polite"
                className="mx-auto flex aspect-[1080/1720] w-full max-w-sm items-center justify-center border border-enhanced-line bg-enhanced-surface px-5 text-center text-sm font-bold text-enhanced-supporting"
                role={renderError ? "alert" : "status"}
              >
                {renderError ? "生成失败，请重试" : "正在生成…"}
              </div>
            ) : (
              <img
                alt="生涯战绩卡"
                className="mx-auto w-full max-w-sm border border-enhanced-line"
                data-share-card-name={previewName}
                src={previewUrl}
              />
            )}
          </section>
        </div>
      </div>
    </Dialog>
  );
}
