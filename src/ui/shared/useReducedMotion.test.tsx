import {
  act,
  renderHook,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  REDUCED_MOTION_QUERY,
  useReducedMotion,
} from "./useReducedMotion";

describe("useReducedMotion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tracks live changes to the reduced-motion media query", () => {
    let matches = false;
    const listeners = new Set<
      (event: MediaQueryListEvent) => void
    >();
    const mediaQuery = {
      addEventListener: (
        type: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => {
        if (type === "change") {
          listeners.add(listener);
        }
      },
      get matches() {
        return matches;
      },
      media: REDUCED_MOTION_QUERY,
      removeEventListener: (
        type: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => {
        if (type === "change") {
          listeners.delete(listener);
        }
      },
    } as MediaQueryList;
    vi.spyOn(window, "matchMedia").mockReturnValue(
      mediaQuery,
    );

    const { result, unmount } = renderHook(
      useReducedMotion,
    );
    expect(result.current).toBe(false);
    expect(window.matchMedia).toHaveBeenCalledWith(
      REDUCED_MOTION_QUERY,
    );

    act(() => {
      matches = true;
      listeners.forEach((listener) =>
        listener({
          matches,
          media: REDUCED_MOTION_QUERY,
        } as MediaQueryListEvent),
      );
    });
    expect(result.current).toBe(true);

    unmount();
    expect(listeners).toHaveLength(0);
  });
});
