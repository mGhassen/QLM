import type { BlockType } from "./types";

export type SpacingToken = "tight" | "normal" | "loose";
export type WidthToken = "full" | "half" | "narrow";
export type TextSizeToken = "s" | "m" | "l";

export const SPACING_TOKEN_VALUES: Record<
  SpacingToken,
  { marginTop?: number; marginBottom?: number; padding?: number }
> = {
  tight: { marginTop: 2, marginBottom: 2, padding: 2 },
  normal: { marginTop: 4, marginBottom: 4, padding: 4 },
  loose: { marginTop: 8, marginBottom: 8, padding: 6 },
};

export const WIDTH_TOKEN_VALUES: Record<WidthToken, string | undefined> = {
  full: undefined,
  half: "50%",
  narrow: "66%",
};

export const TEXT_SIZE_TOKEN_VALUES: Record<TextSizeToken, string> = {
  s: "9pt",
  m: "11pt",
  l: "14pt",
};

export const COLOR_SWATCHES = [
  { label: "Default", value: undefined },
  { label: "Brand", value: "var(--brand)" },
  { label: "Ink", value: "var(--ink)" },
  { label: "Surface", value: "var(--surface)" },
  { label: "Accent", value: "#ffcb51" },
  { label: "Muted", value: "#888888" },
];

export function detectSpacingToken(props: Record<string, unknown>): SpacingToken {
  const mt = props.marginTop as number | undefined;
  const mb = props.marginBottom as number | undefined;
  const pad = props.padding as number | undefined;
  if (mt != null && mt <= 2 && mb != null && mb <= 2) return "tight";
  if (mt != null && mt >= 8 || mb != null && mb >= 8 || pad != null && pad >= 6) return "loose";
  return "normal";
}

export function detectWidthToken(props: Record<string, unknown>): WidthToken {
  const w = props.width as string | undefined;
  if (w === "50%") return "half";
  if (w === "66%") return "narrow";
  return "full";
}

export function detectTextSizeToken(props: Record<string, unknown>): TextSizeToken {
  const fs = props.fontSize as string | undefined;
  if (fs === "9pt") return "s";
  if (fs === "14pt") return "l";
  return "m";
}

export function spacingTokenToProps(token: SpacingToken): Record<string, number | undefined> {
  const v = SPACING_TOKEN_VALUES[token];
  return {
    marginTop: v.marginTop,
    marginBottom: v.marginBottom,
    padding: v.padding,
    marginLeft: undefined,
    marginRight: undefined,
    paddingTop: undefined,
    paddingBottom: undefined,
    paddingLeft: undefined,
    paddingRight: undefined,
  };
}

export function widthTokenToProps(token: WidthToken): Record<string, string | undefined> {
  return { width: WIDTH_TOKEN_VALUES[token] };
}

export function textSizeTokenToProps(token: TextSizeToken): Record<string, string> {
  return { fontSize: TEXT_SIZE_TOKEN_VALUES[token] };
}

const VARIANT_BLOCKS: BlockType[] = ["card", "alert", "rail"];

export function blockSupportsVariant(type: BlockType): boolean {
  return VARIANT_BLOCKS.includes(type);
}

export function blockSupportsSpacing(type: BlockType): boolean {
  return type !== "break";
}

export function blockSupportsWidth(type: BlockType): boolean {
  return ["hero", "figure", "card", "alert", "paragraph", "quote"].includes(type);
}

export function blockSupportsTextSize(type: BlockType): boolean {
  return ["paragraph", "quote", "subheading", "hero", "opener", "seclabel"].includes(type);
}

export function blockSupportsBackground(type: BlockType): boolean {
  return !["break", "brand", "coverToc"].includes(type);
}
