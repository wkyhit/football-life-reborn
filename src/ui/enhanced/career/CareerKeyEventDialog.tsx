import { useEffect, useRef } from "react";

import type { CareerPresentation } from "../../classic/careerPresentation";
import { CareerMilestoneNarrative } from "../../shared/CareerMilestoneNarrative";
import { Dialog } from "../../shared/Dialog";

type MilestonePanel = Extract<
  CareerPresentation["panel"],
  { readonly kind: "milestone" }
>;

type CareerKeyEventDialogProps = {
  readonly onContinue: () => void;
  readonly panel: MilestonePanel;
};

export function CareerKeyEventDialog({
  onContinue,
  panel,
}: CareerKeyEventDialogProps) {
  const continueRef = useRef<HTMLButtonElement>(null);
  const continuedAgeRef = useRef<number | null>(null);

  useEffect(() => {
    continueRef.current?.focus();
  }, [panel.age]);

  const continueOnce = () => {
    if (continuedAgeRef.current === panel.age) {
      return;
    }

    continuedAgeRef.current = panel.age;
    onContinue();
  };

  return (
    <Dialog
      aria-describedby="enhanced-key-event-description"
      className="fixed inset-x-0 bottom-0 top-auto z-[var(--z-modal)] w-full overflow-visible bg-transparent text-enhanced-strong backdrop:bg-enhanced-canvas/80 sm:inset-0 sm:m-auto sm:max-w-[520px]"
      data-enhanced-key-event-dialog=""
      initialFocusRef={continueRef}
      labelledBy="enhanced-key-event-heading"
      onClose={continueOnce}
      variant="enhanced"
    >
      <section className="max-h-[85dvh] overflow-y-auto rounded-t-[var(--radius-card)] border border-enhanced-line bg-enhanced-raised px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-4 sm:rounded-[var(--radius-card)] sm:p-6">
        <p className="text-xs font-bold tracking-[0.10em] text-enhanced-trophy">
          KEY EVENT · {panel.age} 岁 · {panel.club.shortName}
        </p>
        <h2
          className="mt-2 text-lg font-extrabold leading-tight"
          id="enhanced-key-event-heading"
        >
          {panel.age} 岁{panel.title}
        </h2>
        <p
          className="mt-2 text-sm leading-6 text-enhanced-supporting"
          id="enhanced-key-event-description"
        >
          这项关键记录已写入生涯。确认后继续下一项赛季信息。
        </p>
        <div
          className="enhanced-reveal-enter"
          data-enhanced-milestone-reveal=""
        >
          <CareerMilestoneNarrative
            honors={panel.honors}
            nationalTournaments={panel.nationalTournaments}
            statuses={panel.statuses}
            tierChange={panel.tierChange}
            variant="enhanced"
          />
        </div>
        <button
          className="mt-6 min-h-11 w-full rounded-[var(--radius-input)] border border-enhanced-pitch bg-enhanced-pitch px-4 py-3 text-sm font-extrabold text-enhanced-pitch-ink"
          data-enhanced-action="primary"
          data-interaction-state="default"
          onClick={continueOnce}
          ref={continueRef}
          type="button"
        >
          继续
        </button>
      </section>
    </Dialog>
  );
}
