import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEventHandler,
  type PointerEventHandler,
  type RefObject,
  type TouchEventHandler,
  type WheelEventHandler,
} from "react";

const HISTORY_BROWSE_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "End",
  "Enter",
  "Home",
  "PageDown",
  "PageUp",
  " ",
]);

export type TimelineFollowController = {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly isFollowing: boolean;
  readonly onKeyDown: KeyboardEventHandler<HTMLElement>;
  readonly onPointerDown: PointerEventHandler<HTMLElement>;
  readonly onTouchStart: TouchEventHandler<HTMLElement>;
  readonly onWheel: WheelEventHandler<HTMLElement>;
  readonly resume: () => void;
};

export function useTimelineFollow(input: {
  readonly activeAge: number | null;
  readonly reducedMotion: boolean;
}): TimelineFollowController {
  const containerRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(true);
  const [isFollowing, setIsFollowing] = useState(true);
  const suspend = useCallback(() => {
    followingRef.current = false;
    setIsFollowing(false);
  }, []);
  const centerLatest = useCallback(() => {
    const container = containerRef.current;

    if (
      !followingRef.current ||
      container === null ||
      input.activeAge === null
    ) {
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
    const edgeSpaceValue = `${edgeSpace}px`;

    if (
      container.style.getPropertyValue("--timeline-edge-space") !==
      edgeSpaceValue
    ) {
      container.style.setProperty(
        "--timeline-edge-space",
        edgeSpaceValue,
      );
    }

    const containerRect = container.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const centerDelta =
      anchorRect.top +
      anchorRect.height / 2 -
      (containerRect.top + container.clientHeight / 2);

    if (Math.abs(centerDelta) <= 1) {
      return;
    }

    const top = Math.max(
      0,
      container.scrollTop + centerDelta,
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
    const rows = container.querySelector(
      "[data-enhanced-timeline-rows]",
    );

    if (rows !== null) {
      observer.observe(rows);
    }

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
    onPointerDown: (event) => {
      if (event.button === 0) {
        suspend();
      }
    },
    onTouchStart: suspend,
    onWheel: suspend,
    resume: () => {
      followingRef.current = true;
      setIsFollowing(true);
    },
  };
}
