import type { FlexAlign, FlexDirection, FlexJustify } from './block-schema';

import type { SpacingUnit } from './spacing-unit';

export interface BlockStyleProps {
  spacingUnit?: SpacingUnit;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  display?: 'block' | 'flex' | 'grid';
  direction?: FlexDirection;
  align?: FlexAlign;
  justify?: FlexJustify;
  gap?: number;
  colGap?: number;
  rowGap?: number;
  wrap?: boolean;
  cols?: 2 | 3 | 4;
  rows?: 1 | 2 | 3 | 4;
  colWidths?: number[];
  rowHeights?: number[];
  gridColumn?: number;
  gridRow?: number;
  gridColumnSpan?: number;
  gridRowSpan?: number;
  width?: string;
  height?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;
  minWidth?: string;
  overflow?: 'visible' | 'hidden' | 'auto' | 'scroll';
  position?: 'static' | 'relative' | 'absolute';
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: number;
  translateX?: number;
  translateY?: number;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  borderStyle?: string;
  borderRadius?: string;
  bgFullWidth?: boolean;
  bgFullHeight?: boolean;
  fontFamily?: string;
  fontWeight?: number | string;
  fontSize?: string;
  lineHeight?: string | number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
}

export function readBlockStyle(
  props: Record<string, unknown> | undefined,
): BlockStyleProps {
  return (props ?? {}) as BlockStyleProps;
}
