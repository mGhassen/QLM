"use client";

import type { ReactNode } from "react";

interface PageProps {
  children?: ReactNode;
  studioMode?: boolean;
  pageIndex?: number;
  sourcePageId?: string;
  isContinuation?: boolean;
}

export default function Page({ children }: PageProps) {
  return <div className="doc-page-block">{children}</div>;
}
