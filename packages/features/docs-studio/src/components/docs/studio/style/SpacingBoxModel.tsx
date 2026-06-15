"use client";

import { useRef, useState } from "react";
import { resolvePaddingSides } from "#/lib/block-appearance";
import { trackPointerDrag } from "#/lib/fluid-drag";
import {
  commitSpacingValue,
  resolveSpacingUnit,
  spacingDragValue,
  type SpacingUnit,
} from "#/lib/spacing-unit";
import SpacingValuePopover from "./SpacingValuePopover";

interface SpacingBoxModelProps {
  props: Record<string, unknown>;
  onPropsChange: (props: Record<string, unknown>) => void;
}

type Side = "top" | "right" | "bottom" | "left";
type Layer = "margin" | "padding";

type ActiveField = {
  layer: Layer;
  side: Side;
  propKey: string;
};

const MARGIN_KEYS: Record<Side, string> = {
  top: "marginTop",
  right: "marginRight",
  bottom: "marginBottom",
  left: "marginLeft",
};

const PADDING_KEYS: Record<Side, string> = {
  top: "paddingTop",
  right: "paddingRight",
  bottom: "paddingBottom",
  left: "paddingLeft",
};

function dragCursor(side: Side) {
  return side === "left" || side === "right" ? "ew-resize" : "ns-resize";
}

function SideZone({
  side,
  layer,
  value,
  unit,
  active,
  onActivate,
  onDrag,
  onDragEnd,
}: {
  side: Side;
  layer: Layer;
  value: number;
  unit: SpacingUnit;
  active: boolean;
  onActivate: (rect: DOMRect) => void;
  onDrag: (v: number) => void;
  onDragEnd: (v: number | undefined) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef({ value: 0, x: 0, y: 0 });
  const lastRef = useRef<number | undefined>(undefined);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;

    onActivate(rect);
    startRef.current = { value, x: e.clientX, y: e.clientY };
    lastRef.current = commitSpacingValue(value);

    trackPointerDrag(e, {
      cursor: dragCursor(side),
      onMove(ev) {
        const dx = ev.clientX - startRef.current.x;
        const dy = ev.clientY - startRef.current.y;
        const next = spacingDragValue(startRef.current.value, side, layer, unit, dx, dy);
        lastRef.current = commitSpacingValue(next);
        onDrag(next);
      },
      onEnd() {
        onDragEnd(lastRef.current);
      },
    });
  }

  return (
    <button
      ref={btnRef}
      type="button"
      data-spacing-side=""
      className={`wf-spacing-side ${layer} ${side}${active ? " active" : ""}`}
      onPointerDown={onPointerDown}
    >
      <span className="wf-spacing-value">{value}</span>
    </button>
  );
}

export default function SpacingBoxModel({ props, onPropsChange }: SpacingBoxModelProps) {
  const padding = resolvePaddingSides(props);
  const unit = resolveSpacingUnit(props);
  const [active, setActive] = useState<ActiveField | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [dragPreview, setDragPreview] = useState<number | null>(null);

  const setProp = (key: string, value: unknown) =>
    onPropsChange({ ...props, [key]: value, padding: undefined });

  function openField(layer: Layer, side: Side, rect: DOMRect) {
    const propKey = layer === "margin" ? MARGIN_KEYS[side] : PADDING_KEYS[side];
    setActive({ layer, side, propKey });
    setAnchor(rect);
    setDragPreview(null);
  }

  function closeField() {
    setActive(null);
    setAnchor(null);
    setDragPreview(null);
  }

  function storedValue(propKey: string, side: Side): number {
    if (propKey.startsWith("margin")) return (props[propKey] as number) ?? 0;
    return padding[side];
  }

  function displayValue(propKey: string, side: Side): number {
    if (active?.propKey === propKey && dragPreview !== null) return dragPreview;
    return storedValue(propKey, side);
  }

  function activeValue(): number {
    if (!active) return 0;
    if (dragPreview !== null) return dragPreview;
    return storedValue(active.propKey, active.side);
  }

  return (
    <div className="wf-spacing">
      <div className="wf-spacing-margin">
        <span className="wf-spacing-tag">MARGIN</span>
        {(["top", "right", "bottom", "left"] as const).map((side) => {
          const propKey = MARGIN_KEYS[side];
          return (
            <SideZone
              key={`m-${side}`}
              side={side}
              layer="margin"
              unit={unit}
              value={displayValue(propKey, side)}
              active={active?.propKey === propKey}
              onActivate={(rect) => openField("margin", side, rect)}
              onDrag={setDragPreview}
              onDragEnd={(v) => {
                setDragPreview(null);
                setProp(propKey, v);
              }}
            />
          );
        })}

        <div className="wf-spacing-padding">
          <span className="wf-spacing-tag">PADDING</span>
          {(["top", "right", "bottom", "left"] as const).map((side) => {
            const propKey = PADDING_KEYS[side];
            return (
              <SideZone
                key={`p-${side}`}
                side={side}
                layer="padding"
                unit={unit}
                value={displayValue(propKey, side)}
                active={active?.propKey === propKey}
                onActivate={(rect) => openField("padding", side, rect)}
                onDrag={setDragPreview}
                onDragEnd={(v) => {
                  setDragPreview(null);
                  setProp(propKey, v);
                }}
              />
            );
          })}
          <div className="wf-spacing-content" />
        </div>
      </div>

      <SpacingValuePopover
        open={!!active}
        anchor={anchor}
        side={active?.side ?? "top"}
        layer={active?.layer ?? "padding"}
        value={activeValue()}
        unit={unit}
        onValueChange={(v) => {
          if (!active) return;
          setDragPreview(null);
          setProp(active.propKey, v);
        }}
        onUnitChange={(next: SpacingUnit) => {
          onPropsChange({ ...props, spacingUnit: next === "mm" ? undefined : next });
        }}
        onClose={closeField}
      />
    </div>
  );
}
