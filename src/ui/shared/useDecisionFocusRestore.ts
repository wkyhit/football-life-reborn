import { useEffect, useRef } from "react";

const DECISION_OPTION_SELECTOR =
  "[data-career-decision-option]" as const;

export function useDecisionFocusRestore<
  TContainer extends HTMLElement,
>(decisionKey: string | null) {
  const containerRef = useRef<TContainer>(null);
  const previousDecisionKey = useRef(decisionKey);

  useEffect(() => {
    const decisionChanged =
      previousDecisionKey.current !== decisionKey;
    previousDecisionKey.current = decisionKey;

    if (decisionKey === null || !decisionChanged) {
      return;
    }

    const activeElement = document.activeElement;

    if (
      activeElement instanceof HTMLElement &&
      activeElement !== document.body &&
      activeElement.isConnected
    ) {
      return;
    }

    containerRef.current
      ?.querySelector<HTMLButtonElement>(
        DECISION_OPTION_SELECTOR,
      )
      ?.focus();
  }, [decisionKey]);

  return containerRef;
}
