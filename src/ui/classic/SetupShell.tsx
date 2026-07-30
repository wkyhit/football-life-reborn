import type { ReactNode } from "react";

import { SetupProgress } from "./SetupProgress";

type SetupShellProps = {
  children: ReactNode;
  current: 1 | 2 | 3;
};

export function SetupShell({ children, current }: SetupShellProps) {
  return (
    <main
      className="min-h-dvh bg-canvas px-5 py-7 text-primary"
      id="main-content"
    >
      <div className="mx-auto max-w-[1240px]">
        <SetupProgress current={current} />
        {children}
      </div>
    </main>
  );
}
