import {
  useEffect,
  useRef,
  useState,
} from "react";

import type { SummaryPresentation } from "../../ui/classic/summaryPresentation";
import { shareCardFilename } from "./shareCardContract";

type ShareCardOverlayProps = {
  readonly onClose: () => void;
  readonly qrPayload: string;
  readonly view: SummaryPresentation;
};

export function ShareCardOverlay({
  onClose,
  qrPayload,
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

  useEffect(() => {
    let cancelled = false;
    setRenderError(false);

    void import("./shareCard")
      .then(({ createShareCardBlob }) =>
        createShareCardBlob({
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
  }, [displayName, qrPayload, view]);

  useEffect(
    () => () => {
      if (liveUrl.current !== null) {
        URL.revokeObjectURL(liveUrl.current);
      }
    },
    [],
  );

  return (
    <div
      aria-labelledby="share-card-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm"
      data-classic-share-overlay=""
      role="dialog"
    >
      <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-6">
        <h2 className="sr-only" id="share-card-title">
          生涯战绩卡
        </h2>
        <div className="flex items-center gap-2">
          <label
            className="shrink-0 text-[12px] font-bold text-zinc-400"
            htmlFor="share-card-name"
          >
            卡上名字
          </label>
          <input
            className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 text-[14px] font-bold text-zinc-100 outline-none focus:border-emerald-500"
            id="share-card-name"
            maxLength={12}
            onChange={(event) =>
              setDisplayName(event.currentTarget.value)
            }
            placeholder="给自己起个名字"
            value={displayName}
          />
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {previewUrl === null ? (
            <div className="mx-auto flex aspect-[1080/1720] w-full max-w-sm items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-[13px] font-bold text-zinc-500">
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
        <div className="mt-2.5 grid shrink-0 grid-cols-2 gap-2">
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
            onClick={() => {
              if (previewUrl === null) {
                return;
              }

              const anchor = document.createElement("a");
              anchor.href = previewUrl;
              anchor.download = shareCardFilename(
                displayName,
                view,
              );
              anchor.click();
            }}
            type="button"
          >
            下载图片
          </button>
        </div>
      </div>
    </div>
  );
}
