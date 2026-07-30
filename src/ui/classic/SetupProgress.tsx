type SetupProgressProps = {
  current: 1 | 2 | 3;
};

const steps = ["国籍", "身份", "位置"] as const;

export function SetupProgress({ current }: SetupProgressProps) {
  return (
    <div
      aria-label={`建档进度：第 ${current} 步，共 3 步`}
      className="mb-4 flex shrink-0 gap-1.5"
    >
      {steps.map((step, index) => {
        const reached = index + 1 <= current;

        return (
          <div className="flex-1" key={step}>
            <div
              aria-hidden="true"
              className={
                reached
                  ? "h-1 rounded-full bg-accent"
                  : "h-1 rounded-full bg-line"
              }
            />
            <div
              aria-current={index + 1 === current ? "step" : undefined}
              className={
                reached
                  ? "mt-1.5 text-[10px] font-bold leading-[15px] text-accent"
                  : "mt-1.5 text-[10px] font-bold leading-[15px] text-zinc-600"
              }
            >
              {step}
            </div>
          </div>
        );
      })}
    </div>
  );
}
