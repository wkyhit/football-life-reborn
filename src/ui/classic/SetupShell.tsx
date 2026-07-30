import type { ReactNode } from "react";

import { SetupProgress } from "./SetupProgress";

type SetupShellProps = {
  children: ReactNode;
  current: 1 | 2 | 3;
};

export function SetupShell({ children, current }: SetupShellProps) {
  return (
    <main
      className="flex h-dvh flex-col overflow-hidden bg-canvas px-5 pb-6 pt-8 text-primary"
      data-classic-setup-shell=""
      id="main-content"
    >
      <SetupProgress current={current} />
      {children}
    </main>
  );
}
