"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import {
  SPACING_UNITS,
  type SpacingUnit,
  spacingSliderConfig,
} from "#/lib/spacing-unit";

const SIDE_ICONS: Record<"top" | "right" | "bottom" | "left", string> = {
  top: "↓",
  right: "←",
  bottom: "↑",
  left: "→",
};

interface SpacingValuePopoverProps {
  open: boolean;
  anchor: DOMRect | null;
  side: "top" | "right" | "bottom" | "left";
  layer: "margin" | "padding";
  value: number;
  unit: SpacingUnit;
  onValueChange: (value: number | undefined) => void;
  onUnitChange: (unit: SpacingUnit) => void;
  onClose: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function SpacingValuePopover({
  open,
  anchor,
  side,
  layer,
  value,
  unit,
  onValueChange,
  onUnitChange,
  onClose,
}: SpacingValuePopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [unitOpen, setUnitOpen] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const config = spacingSliderConfig(unit, layer);

  useEffect(() => {
    setDraft(String(value));
  }, [value, open]);

  useEffect(() => {
    if (!open) {
      setUnitOpen(false);
      return;
    }
    function onPointerUp(e: PointerEvent) {
      const target = e.target as Node | null;
      if (panelRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-spacing-side]")) return;
      onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !anchor) return null;

  const panelW = 220;
  const panelH = 118;
  let left = anchor.left + anchor.width / 2 - panelW / 2;
  let top = anchor.bottom + 6;
  left = clamp(left, 8, window.innerWidth - panelW - 8);
  if (top + panelH > window.innerHeight - 8) {
    top = anchor.top - panelH - 6;
  }

  function commitValue(raw: number) {
    const next = clamp(raw, config.min, config.max);
    setDraft(String(next));
    onValueChange(next === 0 ? undefined : next);
  }

  function commitDraft(raw: string) {
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    commitValue(parsed);
  }

  return createPortal(
    <div
      ref={panelRef}
      className="wf-spacing-popover"
      style={{ left, top, width: panelW }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="wf-spacing-popover-row">
        <span className="wf-spacing-popover-side" title={`${layer} ${side}`}>
          {SIDE_ICONS[side]}
        </span>
        <input
          type="range"
          className="wf-spacing-popover-slider"
          min={config.min}
          max={config.max}
          step={config.step}
          value={clamp(value, config.min, config.max)}
          onChange={(e) => commitValue(parseFloat(e.target.value))}
        />
        <div className="wf-spacing-popover-input-wrap">
          <input
            type="text"
            className="wf-spacing-popover-value"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commitDraft(draft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitDraft(draft);
                onClose();
              }
            }}
          />
          <div className="wf-spacing-popover-unit-wrap">
            <button
              type="button"
              className="wf-spacing-popover-unit"
              onClick={() => setUnitOpen((v) => !v)}
            >
              {unit.toUpperCase()}
            </button>
            {unitOpen && (
              <div className="wf-spacing-popover-units">
                {SPACING_UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    className={`wf-spacing-popover-unit-opt${u === unit ? " active" : ""}`}
                    onClick={() => {
                      onUnitChange(u);
                      setUnitOpen(false);
                    }}
                  >
                    {u === unit && <span className="wf-spacing-popover-check">✓</span>}
                    {u.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="wf-spacing-popover-presets">
        {config.presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`wf-spacing-popover-preset${value === preset ? " active" : ""}`}
            onClick={() => commitValue(preset)}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
