import {
  useEffect,
  useState,
} from "react";

export const REDUCED_MOTION_QUERY =
  "(prefers-reduced-motion: reduce)" as const;

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(
    readReducedMotion,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(
      REDUCED_MOTION_QUERY,
    );
    const update = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", update);

    return () => {
      mediaQuery.removeEventListener("change", update);
    };
  }, []);

  return reducedMotion;
}

function readReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}
