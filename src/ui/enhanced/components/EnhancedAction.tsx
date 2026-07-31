import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

export type EnhancedActionState =
  | "default"
  | "loading"
  | "error"
  | "success";

export type EnhancedActionTone =
  | "primary"
  | "secondary"
  | "danger";

type EnhancedActionProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  readonly children: ReactNode;
  readonly state?: EnhancedActionState;
  readonly tone?: EnhancedActionTone;
};

const BASE_CLASS =
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-input)] border px-4 text-sm font-bold outline-none transition-[transform,opacity,background-color,border-color,color] duration-[var(--dur-short)] ease-[var(--ease-out)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-opacity motion-reduce:duration-[var(--dur-reduced)]";

const TONE_CLASS: Readonly<
  Record<EnhancedActionTone, string>
> = {
  danger:
    "border-enhanced-alert/40 bg-transparent text-enhanced-alert",
  primary:
    "border-enhanced-pitch bg-enhanced-pitch text-enhanced-pitch-ink",
  secondary:
    "border-enhanced-line bg-transparent text-enhanced-strong",
};

const STATE_CLASS: Readonly<
  Record<EnhancedActionState, string>
> = {
  default: "",
  error:
    "border-enhanced-alert text-enhanced-alert",
  loading: "cursor-wait",
  success:
    "border-enhanced-success text-enhanced-success",
};

export const EnhancedAction = forwardRef<
  HTMLButtonElement,
  EnhancedActionProps
>(function EnhancedAction(
  {
    children,
    className = "",
    disabled = false,
    state = "default",
    tone = "secondary",
    type = "button",
    ...buttonProps
  },
  ref,
) {
  const pending = state === "loading";

  return (
    <button
      {...buttonProps}
      aria-busy={pending}
      className={[
        BASE_CLASS,
        TONE_CLASS[tone],
        STATE_CLASS[state],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-enhanced-action={tone}
      data-interaction-state={state}
      disabled={disabled || pending}
      ref={ref}
      type={type}
    >
      {pending ? (
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full bg-current motion-safe:animate-[enhanced-state-pulse_var(--dur-long)_var(--ease-in-out)_infinite]"
        />
      ) : null}
      <span>{children}</span>
      {state === "success" ? (
        <span aria-hidden="true">✓</span>
      ) : null}
      {pending ? <span className="sr-only">正在处理</span> : null}
    </button>
  );
});
