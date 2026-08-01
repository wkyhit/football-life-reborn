import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  useCallback,
  type RefObject,
} from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTimelineFollow } from "./useTimelineFollow";

describe("useTimelineFollow", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("centers the latest row, yields to manual browsing, and resumes on request", () => {
    const scrollTo = vi.fn();
    const { rerender } = render(
      <TimelineHarness
        activeAge={22}
        rowTop={260}
        scrollTo={scrollTo}
      />,
    );

    expect(scrollTo).toHaveBeenLastCalledWith({
      behavior: "smooth",
      top: 80,
    });
    expect(screen.getByTestId("timeline")).toHaveStyle({
      "--timeline-edge-space": "80px",
    });
    expect(screen.getByTestId("latest-row")).toHaveAttribute(
      "aria-current",
      "step",
    );

    rerender(
      <TimelineHarness
        activeAge={23}
        rowTop={260}
        scrollTo={scrollTo}
      />,
    );
    expect(scrollTo).toHaveBeenCalledTimes(2);

    fireEvent.wheel(screen.getByTestId("timeline"), {
      deltaY: -100,
    });
    expect(
      screen.getByRole("button", { name: "回到最新" }),
    ).toBeVisible();

    rerender(
      <TimelineHarness
        activeAge={24}
        rowTop={260}
        scrollTo={scrollTo}
      />,
    );
    expect(scrollTo).toHaveBeenCalledTimes(2);

    fireEvent.click(
      screen.getByRole("button", { name: "回到最新" }),
    );
    expect(scrollTo).toHaveBeenCalledTimes(3);
    expect(
      screen.queryByRole("button", { name: "回到最新" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["touch", (element: HTMLElement) => fireEvent.touchStart(element)],
    ["keyboard", (element: HTMLElement) => fireEvent.keyDown(element, { key: "PageUp" })],
    ["pointer", (element: HTMLElement) => fireEvent.pointerDown(element, { button: 0 })],
    ["disclosure keyboard", (element: HTMLElement) => fireEvent.keyDown(element, { key: "Enter" })],
  ] as const)(
    "suspends follow for deliberate %s history browsing",
    (_label, browse) => {
      const scrollTo = vi.fn();
      render(
        <TimelineHarness
          activeAge={41}
          rowTop={260}
          scrollTo={scrollTo}
        />,
      );

      browse(screen.getByTestId("timeline"));

      expect(
        screen.getByRole("button", { name: "回到最新" }),
      ).toBeVisible();
    },
  );

  it("uses instant scrolling when reduced motion is active", () => {
    const scrollTo = vi.fn();
    render(
      <TimelineHarness
        activeAge={43}
        reducedMotion
        rowTop={260}
        scrollTo={scrollTo}
      />,
    );

    expect(scrollTo).toHaveBeenLastCalledWith({
      behavior: "auto",
      top: 80,
    });
  });

  it("follows content-height reflow without restarting an already centered scroll", () => {
    const observed = new Set<Element>();
    let resize: ResizeObserverCallback | undefined;

    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback;
        }

        disconnect() {}

        observe(target: Element) {
          observed.add(target);
        }

        unobserve() {}
      },
    );

    const scrollTo = vi.fn();
    render(
      <TimelineHarness
        activeAge={44}
        rowTop={260}
        scrollTo={scrollTo}
      />,
    );
    const content = screen.getByTestId("timeline-rows");
    const anchor = screen.getByTestId("latest-row");

    expect(observed).toContain(content);
    expect(resize).toBeDefined();

    anchor.getBoundingClientRect = () =>
      rect({ height: 40, top: 340 });
    resize!([], {} as ResizeObserver);
    expect(scrollTo).toHaveBeenLastCalledWith({
      behavior: "smooth",
      top: 160,
    });

    anchor.getBoundingClientRect = () =>
      rect({ height: 40, top: 180 });
    scrollTo.mockClear();
    resize!([], {} as ResizeObserver);
    resize!([], {} as ResizeObserver);
    expect(scrollTo).not.toHaveBeenCalled();

    fireEvent.pointerDown(screen.getByTestId("timeline"), {
      button: 0,
    });
    anchor.getBoundingClientRect = () =>
      rect({ height: 40, top: 340 });
    resize!([], {} as ResizeObserver);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

function TimelineHarness({
  activeAge,
  reducedMotion = false,
  rowTop,
  scrollTo,
}: {
  readonly activeAge: number;
  readonly reducedMotion?: boolean;
  readonly rowTop: number;
  readonly scrollTo: ReturnType<typeof vi.fn>;
}) {
  const follow = useTimelineFollow({
    activeAge,
    reducedMotion,
  });
  const rowRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node !== null) {
        node.getBoundingClientRect = () =>
          rect({ height: 40, top: rowTop });
      }
    },
    [rowTop],
  );
  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node !== null) {
        Object.defineProperty(node, "clientHeight", {
          configurable: true,
          value: 200,
        });
        node.getBoundingClientRect = () =>
          rect({ height: 200, top: 100 });
        node.scrollTo = scrollTo as HTMLDivElement["scrollTo"];
      }

      setRef(follow.containerRef, node);
    },
    [follow.containerRef, scrollTo],
  );

  return (
    <>
      <div
        data-testid="timeline"
        onKeyDown={follow.onKeyDown}
        onPointerDown={follow.onPointerDown}
        onTouchStart={follow.onTouchStart}
        onWheel={follow.onWheel}
        ref={containerRef}
        tabIndex={0}
      >
        <div
          data-enhanced-timeline-rows=""
          data-testid="timeline-rows"
        >
          <div
            aria-current="step"
            data-career-season-row={activeAge}
            data-testid="latest-row"
            ref={rowRef}
          />
        </div>
      </div>
      {!follow.isFollowing ? (
        <button onClick={follow.resume} type="button">
          回到最新
        </button>
      ) : null}
    </>
  );
}

function setRef(
  ref: RefObject<HTMLDivElement | null>,
  value: HTMLDivElement | null,
): void {
  ref.current = value;
}

function rect(input: {
  readonly height: number;
  readonly top: number;
}): DOMRect {
  return {
    bottom: input.top + input.height,
    height: input.height,
    left: 0,
    right: 320,
    toJSON: () => ({}),
    top: input.top,
    width: 320,
    x: 0,
    y: input.top,
  };
}
