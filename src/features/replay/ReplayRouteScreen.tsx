import {
  lazy,
  Suspense,
  useState,
} from "react";

import { evaluateChallengeProgress } from "../challenges/progress";
import type { ShareCardChallenge } from "../share-card/shareCardContract";
import { createSummaryPresentation } from "../../ui/classic/summaryPresentation";
import { EnhancedAction } from "../../ui/enhanced/components/EnhancedAction";
import { EnhancedAppBar } from "../../ui/enhanced/components/EnhancedAppBar";
import { EnhancedStateSurface } from "../../ui/enhanced/components/EnhancedStateSurface";
import { EnhancedSummaryScreen } from "../../ui/enhanced/summary/EnhancedSummaryScreen";
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
      <EnhancedSummaryScreen
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
        <Suspense fallback={<ReplayOverlayLoading />}>
          <ReplayShareCardOverlay
            challenge={shareChallenge}
            onClose={() => setShareOpen(false)}
            qrPayload={replayUrl}
            variant="enhanced"
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
      className="min-h-dvh bg-enhanced-canvas text-enhanced-strong"
      data-hallmark-macrostructure="Index-First"
      data-replay-error-kind={route.kind}
      data-replay-route="error"
      id="main-content"
      tabIndex={-1}
    >
      {/* Hallmark · genre: playful · macrostructure: Index-First · theme: custom (tuned) · design-system: design.md · designed-as-app */}
      <EnhancedAppBar
        context="Replay recovery"
        currentLabel="回放"
      />
      <div className="mx-auto w-full max-w-[var(--shell-max)] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <EnhancedStateSurface
          action={
            <EnhancedAction
              onClick={returnToEntry}
              tone="primary"
            >
              返回入口
            </EnhancedAction>
          }
          description={route.detail}
          detail={
            <p className="max-w-[52ch]">
              {route.recovery}
            </p>
          }
          eyebrow="Replay recovery"
          state="error"
          title={route.title}
        />
      </div>
    </main>
  );
}

function ReplayOverlayLoading() {
  return (
    <div
      aria-busy="true"
      className="fixed inset-x-4 bottom-4 z-[var(--z-modal)] mx-auto flex min-h-14 max-w-md items-center gap-3 border border-enhanced-line bg-enhanced-raised px-4 text-sm font-bold text-enhanced-strong"
      data-enhanced-state="loading"
      role="status"
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 bg-enhanced-pitch motion-safe:animate-[enhanced-state-pulse_var(--dur-long)_var(--ease-in-out)_infinite]"
      />
      正在生成分享卡片
    </div>
  );
}

function returnToEntry(): void {
  const url = new URL(window.location.href);
  url.hash = "";
  window.location.assign(url.toString());
}
