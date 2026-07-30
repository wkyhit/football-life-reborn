import type { ReactNode } from "react";

type ClassicShellProps = {
  readonly children: ReactNode;
};

export function ClassicShell({
  children,
}: ClassicShellProps) {
  return (
    <div className="contents" data-ui-mode="classic">
      {children}
    </div>
  );
}
