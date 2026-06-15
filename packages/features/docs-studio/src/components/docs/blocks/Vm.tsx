import type { ReactNode } from 'react';

export default function Vm({ children }: { children?: ReactNode }) {
  return <div className="vm">{children}</div>;
}
