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
  const classicDialogRef = useRef<HTMLDivElement>(null);
  const enhancedDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const returnTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dialog =
      variant === "enhanced"
        ? enhancedDialogRef.current
        : classicDialogRef.current;
    let openedNativeDialog = false;

    if (
      variant === "enhanced" &&
      dialog instanceof HTMLDialogElement
    ) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
        openedNativeDialog = true;
      } else {
        dialog.setAttribute("open", "");
      }
    }

    const target =
      initialFocusRef?.current ??
      (dialog === null ? null : focusableElements(dialog)[0]) ??
      dialog;
    target?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;

      if (
        openedNativeDialog &&
        dialog instanceof HTMLDialogElement &&
        dialog.open
      ) {
        dialog.close();
      }

      returnTarget?.focus();
    };
  }, [initialFocusRef, variant]);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLElement>,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const currentDialog =
      variant === "enhanced"
        ? enhancedDialogRef.current
        : classicDialogRef.current;

    if (currentDialog === null) {
      return;
    }

    const focusable = focusableElements(currentDialog);
    const first = focusable[0];
    const last = focusable.at(-1);
    const active = document.activeElement;

    if (first === undefined || last === undefined) {
      event.preventDefault();
      currentDialog.focus();
      return;
    }

    if (
      event.shiftKey &&
      (active === first || !currentDialog.contains(active))
    ) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (
      !event.shiftKey &&
      (active === last || !currentDialog.contains(active))
    ) {
      event.preventDefault();
      first.focus();
    }
  };

  if (variant === "enhanced") {
    const {
      className = "",
      ...enhancedDialogProps
    } = dialogProps;

    return (
      <dialog
        {...(enhancedDialogProps as ComponentPropsWithoutRef<"dialog">)}
        aria-labelledby={labelledBy}
        className={[
          "m-0 max-h-none max-w-none border-0 p-0",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        data-dialog-variant="enhanced"
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onKeyDown={handleKeyDown}
        ref={enhancedDialogRef}
      >
        {children}
      </dialog>
    );
  }

  return (
    <div
      {...dialogProps}
      aria-labelledby={labelledBy}
      aria-modal="true"
      data-dialog-variant={variant}
      onKeyDown={handleKeyDown}
      ref={classicDialogRef}
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
