import type { CSSProperties, ReactNode } from "react";
import "./docs-print.css";

interface DocPageShellProps {
  title: string;
  children: ReactNode;
  style?: CSSProperties;
}

export default function DocPageShell({ title, children, style }: DocPageShellProps) {
  return (
    <div className="doc-shell">
      <div className="doc-page" data-doc-title={title} style={style}>
        {children}
      </div>
    </div>
  );
}
