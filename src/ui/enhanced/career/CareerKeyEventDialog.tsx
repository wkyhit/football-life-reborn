import { useRef } from "react";

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
  const continuedRef = useRef(false);

  const continueOnce = () => {
    if (continuedRef.current) {
      return;
    }

    continuedRef.current = true;
    onContinue();
  };

  return (
    <Dialog
      aria-describedby="enhanced-key-event-description"
      className="fixed inset-x-0 bottom-0 top-auto z-50 w-full overflow-visible bg-transparent text-enhanced-strong backdrop:bg-black/60 sm:inset-0 sm:m-auto sm:max-w-[520px]"
      data-enhanced-key-event-dialog=""
      initialFocusRef={continueRef}
      labelledBy="enhanced-key-event-heading"
      onClose={continueOnce}
      variant="enhanced"
    >
      <section className="max-h-[85dvh] overflow-y-auto rounded-t-[18px] border border-enhanced-line bg-enhanced-raised px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:rounded-[18px] sm:p-6">
        <p className="text-xs font-bold tracking-[0.10em] text-enhanced-trophy">
          KEY EVENT · {panel.age} 岁 · {panel.club.shortName}
        </p>
        <h2
          className="mt-2 text-[24px] font-extrabold leading-tight"
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
          className="mt-6 min-h-11 w-full rounded-[10px] bg-enhanced-pitch px-4 py-3 text-sm font-extrabold text-white outline-none focus-visible:ring-2 focus-visible:ring-enhanced-focus focus-visible:ring-offset-2 focus-visible:ring-offset-enhanced-raised"
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
