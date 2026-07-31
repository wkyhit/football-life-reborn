import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type RefObject,
} from "react";

type DialogProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "aria-labelledby" | "aria-modal" | "onKeyDown" | "role"
> & {
  readonly initialFocusRef?: RefObject<HTMLElement | null>;
  readonly labelledBy: string;
  readonly onClose: () => void;
  readonly variant?: "classic" | "enhanced";
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function Dialog({
  children,
  initialFocusRef,
  labelledBy,
  onClose,
  variant = "classic",
  ...dialogProps
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const returnTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    const target =
      initialFocusRef?.current ??
      (dialog === null ? null : focusableElements(dialog)[0]) ??
      dialog;
    target?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      returnTarget?.focus();
    };
  }, [initialFocusRef]);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    const focusable = focusableElements(dialog);
    const first = focusable[0];
    const last = focusable.at(-1);
    const active = document.activeElement;

    if (first === undefined || last === undefined) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    if (
      event.shiftKey &&
      (active === first || !dialog.contains(active))
    ) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (
      !event.shiftKey &&
      (active === last || !dialog.contains(active))
    ) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      {...dialogProps}
      aria-labelledby={labelledBy}
      aria-modal="true"
      data-dialog-variant={variant}
      onKeyDown={handleKeyDown}
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

function focusableElements(
  container: HTMLElement,
): readonly HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      FOCUSABLE_SELECTOR,
    ),
  ).filter(
    (element) =>
      element.getAttribute("aria-hidden") !== "true" &&
      !element.hasAttribute("hidden"),
  );
}
