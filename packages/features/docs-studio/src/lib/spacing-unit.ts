export type SpacingUnit = "px" | "%" | "ch" | "em" | "rem" | "mm" | "vw" | "vh" | "svw" | "svh";

export const SPACING_UNITS: SpacingUnit[] = ["px", "%", "ch", "em", "rem", "mm", "vw", "vh", "svw", "svh"];

export const PX_PRESETS = [0, 10, 20, 40, 60, 100, 140, 220] as const;

export function resolveSpacingUnit(props: Record<string, unknown> | undefined): SpacingUnit {
  const unit = props?.spacingUnit as SpacingUnit | undefined;
  return unit && SPACING_UNITS.includes(unit) ? unit : "mm";
}

export function spacingSliderConfig(unit: SpacingUnit, layer: "margin" | "padding") {
  if (unit === "mm") {
    return layer === "margin"
      ? { min: -24, max: 24, step: 0.5, presets: [-12, -6, 0, 6, 12, 18, 24] as number[] }
      : { min: -16, max: 16, step: 0.5, presets: [-8, -4, 0, 4, 8, 12, 16] as number[] };
  }
  if (unit === "em" || unit === "rem") {
    return { min: 0, max: 10, step: 0.1, presets: [0, 0.5, 1, 1.5, 2, 3, 4, 6] };
  }
  if (unit === "%" || unit === "vw" || unit === "vh" || unit === "svw" || unit === "svh") {
    return { min: 0, max: 100, step: 1, presets: [0, 5, 10, 20, 40, 60, 80, 100] };
  }
  if (unit === "ch") {
    return { min: 0, max: 80, step: 1, presets: [0, 4, 8, 16, 24, 40, 60, 80] };
  }
  return {
    min: layer === "margin" ? -100 : 0,
    max: 220,
    step: 1,
    presets: [...PX_PRESETS],
  };
}

export function formatSpacingValue(value: number, unit: SpacingUnit): string {
  const rounded = unit === "mm" || unit === "em" || unit === "rem"
    ? Math.round(value * 10) / 10
    : Math.round(value);
  return `${rounded}${unit}`;
}

export function snapSpacingValue(value: number, unit: SpacingUnit, layer: "margin" | "padding") {
  const { min, max, step } = spacingSliderConfig(unit, layer);
  const snapped = Math.round(value / step) * step;
  return Math.max(min, Math.min(max, snapped));
}

export function commitSpacingValue(value: number) {
  return value === 0 ? undefined : value;
}

function dragAxisDelta(side: "top" | "right" | "bottom" | "left", dx: number, dy: number) {
  if (side === "top") return -dy;
  if (side === "bottom") return dy;
  if (side === "left") return -dx;
  return dx;
}

function dragPxPerUnit(unit: SpacingUnit) {
  if (unit === "mm") return 4;
  if (unit === "em" || unit === "rem") return 16;
  return 1;
}

export function spacingDragValue(
  start: number,
  side: "top" | "right" | "bottom" | "left",
  layer: "margin" | "padding",
  unit: SpacingUnit,
  dx: number,
  dy: number,
) {
  const delta = dragAxisDelta(side, dx, dy) / dragPxPerUnit(unit);
  return snapSpacingValue(start + delta, unit, layer);
}
