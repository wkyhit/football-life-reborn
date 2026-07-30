import { primaryButtonClass, secondaryButtonClass } from "./classNames";

type SetupFooterProps = {
  nextDisabled?: boolean;
  nextLabel: string;
  onBack: () => void;
  onNext: () => void;
  paddingTop?: "none" | "small" | "standard";
};

export function SetupFooter({
  nextDisabled = false,
  nextLabel,
  onBack,
  onNext,
  paddingTop = "standard",
}: SetupFooterProps) {
  return (
    <div
      className={`flex shrink-0 gap-3 ${
        paddingTop === "none"
          ? ""
          : paddingTop === "small"
            ? "pt-2"
            : "pt-3"
      }`}
      data-classic-setup-footer=""
    >
      <button
        className={`${secondaryButtonClass} flex-1`}
        onClick={onBack}
        type="button"
      >
        上一步
      </button>
      <button
        className={`${primaryButtonClass} flex-[2]`}
        disabled={nextDisabled}
        onClick={onNext}
        type="button"
      >
        {nextLabel}
      </button>
    </div>
  );
}
