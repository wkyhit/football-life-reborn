import type { ReactNode } from "react";

type EnhancedShellProps = {
  readonly children: ReactNode;
};

export function EnhancedShell({
  children,
}: EnhancedShellProps) {
  return (
    <div
      className="contents"
      data-enhanced-shell="v1"
      data-ui-mode="enhanced"
    >
      {children}
    </div>
  );
}
