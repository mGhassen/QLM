import type { CSSProperties } from "react";
import { formatSpacingValue, resolveSpacingUnit } from "./spacing-unit";
import type { BlockType } from "./types";

const NO_BLEED_TYPES = new Set<BlockType>(["cover", "section"]);

export interface BlockAppearance {
  className: string;
  style: CSSProperties;
  dataAttrs: Record<string, string | undefined>;
}

export interface PaddingSides {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function resolvePaddingSides(props: Record<string, unknown> | undefined): PaddingSides {
  const fallback = (props?.padding as number) ?? 0;
  return {
    top: (props?.paddingTop as number) ?? fallback,
    bottom: (props?.paddingBottom as number) ?? fallback,
    left: (props?.paddingLeft as number) ?? fallback,
    right: (props?.paddingRight as number) ?? fallback,
  };
}

export function applyPaddingSides(
  style: CSSProperties,
  sides: PaddingSides,
  unit = resolveSpacingUnit(undefined),
) {
  const { top, bottom, left, right } = sides;
  if (top === bottom && bottom === left && left === right) {
    if (top !== 0) style.padding = formatSpacingValue(top, unit);
    return;
  }
  if (top) style.paddingTop = formatSpacingValue(top, unit);
  if (bottom) style.paddingBottom = formatSpacingValue(bottom, unit);
  if (left) style.paddingLeft = formatSpacingValue(left, unit);
  if (right) style.paddingRight = formatSpacingValue(right, unit);
}

export function blockAppearanceProps(
  type: BlockType,
  props: Record<string, unknown> | undefined,
): BlockAppearance {
  if (!props) return { className: "", style: {}, dataAttrs: {} };

  const style: CSSProperties = {};
  const classes: string[] = [];
  const dataAttrs: Record<string, string | undefined> = {};

  const bg = props.backgroundColor as string | undefined;
  if (bg) {
    dataAttrs["data-block-bg"] = "true";
    (style as Record<string, string>)["--block-bg"] = bg;
  }

  const canBleed = !NO_BLEED_TYPES.has(type);
  if (canBleed && props.bgFullWidth) {
    dataAttrs["data-bg-full-width"] = "true";
    classes.push("block-bg-full-x");
  }
  if (canBleed && props.bgFullHeight) {
    dataAttrs["data-bg-full-height"] = "true";
    classes.push("block-bg-full-y");
  }

  if (props.color) style.color = props.color as string;
  if (props.borderColor) style.borderColor = props.borderColor as string;
  if (props.borderWidth) style.borderWidth = props.borderWidth as string;
  if (props.borderStyle) style.borderStyle = props.borderStyle as string;
  const spacingUnit = resolveSpacingUnit(props);
  applyPaddingSides(style, resolvePaddingSides(props), spacingUnit);
  if (props.marginTop != null) {
    style.marginTop = formatSpacingValue(props.marginTop as number, spacingUnit);
    dataAttrs["data-block-mt"] = "true";
  }
  if (props.marginBottom != null) {
    style.marginBottom = formatSpacingValue(props.marginBottom as number, spacingUnit);
    dataAttrs["data-block-mb"] = "true";
  }
  if (props.marginLeft != null) {
    style.marginLeft = formatSpacingValue(props.marginLeft as number, spacingUnit);
  }
  if (props.marginRight != null) {
    style.marginRight = formatSpacingValue(props.marginRight as number, spacingUnit);
  }
  if (props.maxWidth) style.maxWidth = props.maxWidth as string;
  if (props.maxHeight) style.maxHeight = props.maxHeight as string;
  if (props.minWidth) style.minWidth = props.minWidth as string;
  if (props.fontSize) style.fontSize = props.fontSize as string;
  if (props.fontWeight) style.fontWeight = props.fontWeight as number | string;
  if (props.lineHeight) style.lineHeight = props.lineHeight as string | number;
  if (props.textAlign) style.textAlign = props.textAlign as CSSProperties["textAlign"];
  if (props.overflow) style.overflow = props.overflow as CSSProperties["overflow"];
  if (props.position) style.position = props.position as CSSProperties["position"];
  if (props.zIndex != null) style.zIndex = props.zIndex as number;
  if (props.gridColumn) style.gridColumn = String(props.gridColumn);
  if (props.gridRow) style.gridRow = String(props.gridRow);
  if (props.gridColumnSpan) style.gridColumn = `span ${props.gridColumnSpan}`;
  if (props.gridRowSpan) style.gridRow = `span ${props.gridRowSpan}`;
  if (props.width) {
    style.width = props.width as string;
    style.flex = "0 0 auto";
    dataAttrs["data-has-width"] = "true";
  }
  if (props.height) style.height = props.height as string;
  if (props.minHeight) style.minHeight = props.minHeight as string;
  if (props.borderRadius) style.borderRadius = props.borderRadius as string;

  const tx = (props.translateX as number) ?? 0;
  const ty = (props.translateY as number) ?? 0;
  if (tx || ty) style.transform = `translate(${tx}px, ${ty}px)`;

  if (props.width || props.height || tx || ty) {
    style.position = "relative";
    style.boxSizing = "border-box";
  }

  if (!bg && (props.borderColor || props.backgroundColor)) {
    style.borderStyle = (props.borderStyle as string) ?? "solid";
    style.borderWidth = (props.borderWidth as string) ?? "1px";
  }

  if (bg && !canBleed) {
    style.backgroundColor = bg;
  }

  return {
    className: classes.join(" "),
    style,
    dataAttrs,
  };
}

export function hasBlockAppearance(appearance: BlockAppearance): boolean {
  return (
    !!appearance.className ||
    Object.keys(appearance.style).length > 0 ||
    !!appearance.dataAttrs["data-block-bg"]
  );
}
