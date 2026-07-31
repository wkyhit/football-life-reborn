import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEventHandler,
  type RefObject,
  type TouchEventHandler,
  type WheelEventHandler,
} from "react";

const HISTORY_BROWSE_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
  " ",
]);

export type TimelineFollowController = {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly isFollowing: boolean;
  readonly onKeyDown: KeyboardEventHandler<HTMLElement>;
  readonly onTouchStart: TouchEventHandler<HTMLElement>;
  readonly onWheel: WheelEventHandler<HTMLElement>;
  readonly resume: () => void;
};

export function useTimelineFollow(input: {
  readonly activeAge: number | null;
  readonly reducedMotion: boolean;
}): TimelineFollowController {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const suspend = useCallback(() => {
    setIsFollowing(false);
  }, []);
  const centerLatest = useCallback(() => {
    const container = containerRef.current;

    if (container === null || input.activeAge === null) {
      return;
    }

    const anchor = container.querySelector<HTMLElement>(
      `[data-career-season-row="${input.activeAge}"]`,
    );

    if (anchor === null) {
      return;
    }

    const initialAnchorRect = anchor.getBoundingClientRect();
    const edgeSpace = Math.max(
      0,
      (container.clientHeight - initialAnchorRect.height) / 2,
    );
    container.style.setProperty(
      "--timeline-edge-space",
      `${edgeSpace}px`,
    );

    const containerRect = container.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const top = Math.max(
      0,
      container.scrollTop +
        anchorRect.top -
        containerRect.top -
        (container.clientHeight - anchorRect.height) / 2,
    );

    if (typeof container.scrollTo === "function") {
      container.scrollTo({
        behavior: input.reducedMotion ? "auto" : "smooth",
        top,
      });
    } else {
      container.scrollTop = top;
    }
  }, [input.activeAge, input.reducedMotion]);

  useLayoutEffect(() => {
    if (!isFollowing) {
      return;
    }

    centerLatest();

    const container = containerRef.current;

    if (
      container === null ||
      typeof ResizeObserver !== "function"
    ) {
      return;
    }

    const observer = new ResizeObserver(centerLatest);
    observer.observe(container);

    return () => observer.disconnect();
  }, [centerLatest, isFollowing]);

  return {
    containerRef,
    isFollowing,
    onKeyDown: (event) => {
      if (HISTORY_BROWSE_KEYS.has(event.key)) {
        suspend();
      }
    },
    onTouchStart: suspend,
    onWheel: suspend,
    resume: () => setIsFollowing(true),
  };
}
