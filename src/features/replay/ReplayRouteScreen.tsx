import {
  lazy,
  Suspense,
  useState,
} from "react";

import { evaluateChallengeProgress } from "../challenges/progress";
import type { ShareCardChallenge } from "../share-card/shareCardContract";
import { SummaryScreen } from "../../ui/classic/SummaryScreen";
import { createSummaryPresentation } from "../../ui/classic/summaryPresentation";
import type { ReplayRouteResult } from "./route";

const ReplayShareCardOverlay = lazy(async () => {
  const module = await import(
    "../share-card/ShareCardOverlay"
  );
  return { default: module.ShareCardOverlay };
});

type ActiveReplayRoute = Exclude<
  ReplayRouteResult,
  { status: "absent" }
>;

export function ReplayRouteScreen({
  route,
}: {
  readonly route: ActiveReplayRoute;
}) {
  if (route.status === "error") {
    return <ReplayErrorScreen route={route} />;
  }

  return <ReadyReplayScreen route={route} />;
}

function ReadyReplayScreen({
  route,
}: {
  readonly route: Extract<
    ReplayRouteResult,
    { status: "ready" }
  >;
}) {
  const [copyMessage, setCopyMessage] = useState<
    string | null
  >(null);
  const [shareOpen, setShareOpen] = useState(false);
  const view = createSummaryPresentation(route.career);
  const progress = evaluateChallengeProgress(
    route.challenge.family,
    route.career,
  );
  const replayUrl = window.location.href;
  const shareChallenge: ShareCardChallenge = {
    calendarDate: route.challenge.calendarDate,
    status: progress.status,
    title: progress.title,
  };

  return (
    <div className="contents" data-replay-route="ready">
      <SummaryScreen
        challenge={{
          daily: route.challenge,
          progress,
          replayUrl,
        }}
        contextLabel="只读确定性回放"
        onCopyReplay={() => {
          if (navigator.clipboard === undefined) {
            setCopyMessage(
              "复制失败，请手动选择回放链接",
            );
            return;
          }

          void navigator.clipboard
            .writeText(replayUrl)
            .then(() => setCopyMessage("回放链接已复制"))
            .catch(() =>
              setCopyMessage(
                "复制失败，请手动选择回放链接",
              ),
            );
        }}
        onRestart={returnToEntry}
        onShare={() => setShareOpen(true)}
        replayCopyMessage={copyMessage}
        view={view}
      />
      {shareOpen ? (
        <Suspense fallback={null}>
          <ReplayShareCardOverlay
            challenge={shareChallenge}
            onClose={() => setShareOpen(false)}
            qrPayload={replayUrl}
            view={view}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

function ReplayErrorScreen({
  route,
}: {
  readonly route: Extract<
    ReplayRouteResult,
    { status: "error" }
  >;
}) {
  return (
    <main
      className="flex min-h-dvh items-center bg-enhanced-canvas px-5 py-10 text-zinc-100"
      data-replay-error-kind={route.kind}
      data-replay-route="error"
      id="main-content"
    >
      <section
        aria-labelledby="replay-error-heading"
        className="mx-auto w-full max-w-lg rounded-[16px] border border-red-400/20 bg-zinc-900 p-6 shadow-2xl"
        role="alert"
      >
        <p className="text-[10px] font-bold tracking-[0.14em] text-red-300">
          REPLAY RECOVERY
        </p>
        <h1
          className="mt-3 text-2xl font-extrabold"
          id="replay-error-heading"
        >
          {route.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          {route.detail}
        </p>
        <p className="mt-3 rounded-[10px] bg-black/20 p-3 text-xs leading-5 text-zinc-400">
          {route.recovery}
        </p>
        <button
          className="mt-6 min-h-12 w-full rounded-[10px] bg-emerald-400 px-4 text-sm font-extrabold text-zinc-950"
          onClick={returnToEntry}
          type="button"
        >
          返回普通入口
        </button>
      </section>
    </main>
  );
}

function returnToEntry(): void {
  const url = new URL(window.location.href);
  url.hash = "";
  window.location.assign(url.toString());
}
