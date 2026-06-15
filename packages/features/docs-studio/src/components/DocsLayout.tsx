import type { ReactNode } from 'react';

import '#/styles/index.css';

type DocsLayoutProps = {
  children: ReactNode;
};

export function DocsLayout({ children }: DocsLayoutProps) {
  return <div className="bg-background min-h-screen">{children}</div>;
}
