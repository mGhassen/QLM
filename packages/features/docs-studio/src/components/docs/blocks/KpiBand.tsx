import type { ReactNode } from 'react';

export default function KpiBand({ children }: { children?: ReactNode }) {
  return <div className="kpiband">{children}</div>;
}
