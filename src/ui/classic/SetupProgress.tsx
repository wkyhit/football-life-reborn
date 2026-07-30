type SetupProgressProps = {
  current: 1 | 2 | 3;
};

const steps = ["国籍", "身份", "位置"] as const;
const stepAlignment = ["text-left", "text-center", "text-right"] as const;

export function SetupProgress({ current }: SetupProgressProps) {
  return (
    <div aria-label={`建档进度：第 ${current} 步，共 3 步`} className="mb-7">
      <div className="grid grid-cols-3 gap-1" aria-hidden="true">
        {steps.map((step, index) => (
          <span
            className={
              index + 1 <= current
                ? "h-1 rounded-full bg-accent"
                : "h-1 rounded-full bg-line"
            }
            key={step}
          />
        ))}
      </div>
      <ol className="mt-2 grid grid-cols-3 text-[11px]">
        {steps.map((step, index) => (
          <li
            aria-current={index + 1 === current ? "step" : undefined}
            className={`${stepAlignment[index]} ${
              index + 1 <= current ? "text-accent" : "text-muted"
            }`}
            key={step}
          >
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
