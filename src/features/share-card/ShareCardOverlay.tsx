import {
  useEffect,
  useRef,
  useState,
} from "react";

import type { SummaryPresentation } from "../../ui/classic/summaryPresentation";
import { Dialog } from "../../ui/shared/Dialog";
import {
  shareCardFilename,
  type ShareCardChallenge,
} from "./shareCardContract";

type ShareCardOverlayProps = {
  readonly challenge?: ShareCardChallenge;
  readonly onClose: () => void;
  readonly qrPayload: string;
  readonly view: SummaryPresentation;
};

export function ShareCardOverlay({
  challenge,
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

  return (
    <Dialog
      className="fixed inset-0 z-50 flex flex-col bg-enhanced-canvas"
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
          <p className="mb-3 text-center text-[12px] font-extrabold text-enhanced-pitch">
            {challenge.title} · {challenge.calendarDate}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <label
            className="shrink-0 text-[12px] font-bold text-enhanced-supporting"
            htmlFor="share-card-name"
          >
            卡上名字
          </label>
          <input
            className="h-9 min-w-0 flex-1 rounded-lg border border-enhanced-line bg-enhanced-surface px-2.5 text-[14px] font-bold text-enhanced-strong outline-none focus:border-enhanced-pitch"
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
            <div className="mx-auto flex aspect-[1080/1720] w-full max-w-sm items-center justify-center rounded-xl border border-enhanced-raised bg-enhanced-canvas text-[13px] font-bold text-enhanced-supporting">
              {renderError ? "生成失败，请重试" : "正在生成…"}
            </div>
          ) : (
            <img
              alt="生涯战绩卡"
              className="mx-auto w-full max-w-sm rounded-xl border border-enhanced-raised"
              data-share-card-name={previewName}
              src={previewUrl}
            />
          )}
        </div>

        <p className="mt-3 text-center text-[14px] font-bold text-enhanced-trophy">
          长按图片保存，或下载后发给朋友
        </p>
        <div className="mt-2.5 grid shrink-0 grid-cols-2 gap-2">
          <button
            className="h-12 rounded-xl border border-enhanced-line px-5 text-[15px] text-enhanced-strong transition-colors active:bg-enhanced-raised disabled:cursor-not-allowed disabled:text-enhanced-neutral"
            onClick={onClose}
            type="button"
          >
            关闭
          </button>
          <button
            className="h-12 rounded-xl bg-enhanced-pitch px-5 text-[15px] font-bold text-enhanced-canvas transition-colors active:bg-enhanced-pitch disabled:cursor-not-allowed disabled:bg-enhanced-raised disabled:text-enhanced-neutral"
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
                challenge,
              );
              anchor.click();
            }}
            type="button"
          >
            下载图片
          </button>
        </div>
      </div>
    </Dialog>
  );
}
