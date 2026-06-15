import type { CSSProperties, ReactNode } from 'react';

interface SectionProps {
  id?: string;
  variant?: string;
  pageBreak?: boolean;
  continuation?: boolean;
  padding?: number;
  children?: ReactNode;
}

export default function Section({
  id,
  variant,
  pageBreak,
  continuation,
  padding,
  children,
}: SectionProps) {
  const style: CSSProperties = {};
  if (pageBreak && !continuation) style.pageBreakBefore = 'always';
  if (padding) {
    style.paddingLeft = `calc(var(--doc-margin-left, 16mm) + ${padding}mm)`;
    style.paddingRight = `calc(var(--doc-margin-right, 16mm) + ${padding}mm)`;
  }

  const isCover = variant === 'cover';
  const Tag = isCover ? 'div' : 'section';
  const className = isCover
    ? `cover${pageBreak && !continuation ? ' page-break' : ''}${continuation ? ' section-continuation' : ''}`
    : `doc-section${pageBreak && !continuation ? ' page-break' : ''}${continuation ? ' section-continuation' : ''}`;

  return (
    <Tag
      id={id}
      className={className}
      style={Object.keys(style).length ? style : undefined}
    >
      {children}
    </Tag>
  );
}
