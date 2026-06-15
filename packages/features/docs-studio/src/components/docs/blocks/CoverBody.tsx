import type { ReactNode } from "react";

export default function CoverBody({ children }: { children?: ReactNode }) {
  return <div className="cover-body">{children}</div>;
}
