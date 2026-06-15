import type { CSSProperties, ReactNode } from "react";

interface CoverProps {
  id?: string;
  pageBreak?: boolean;
  continuation?: boolean;
  padding?: number;
  children?: ReactNode;
}

export default function Cover({ id, pageBreak, continuation, padding, children }: CoverProps) {
  const style: CSSProperties = {};
  if (pageBreak && !continuation) style.pageBreakBefore = "always";
  if (padding) {
    style.paddingLeft = `calc(var(--doc-margin-left, 16mm) + ${padding}mm)`;
    style.paddingRight = `calc(var(--doc-margin-right, 16mm) + ${padding}mm)`;
  }

  return (
    <div
      id={id}
      className={`cover${pageBreak && !continuation ? " page-break" : ""}${continuation ? " section-continuation" : ""}`}
      style={Object.keys(style).length ? style : undefined}
    >
      {children}
    </div>
  );
}
