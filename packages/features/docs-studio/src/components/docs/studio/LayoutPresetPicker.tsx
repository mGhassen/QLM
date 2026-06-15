"use client";

import { LAYOUT_PRESETS } from "#/lib/layout-presets";
import type { BlockNode } from "#/lib/types";

interface LayoutPresetPickerProps {
  onSelect: (block: BlockNode) => void;
}

export default function LayoutPresetPicker({ onSelect }: LayoutPresetPickerProps) {
  return (
    <div className="studio-preset-picker">
      <div className="text-sidebar-foreground/50 mb-2 px-1 text-[10px] font-medium tracking-[0.12em] uppercase">
        Layout presets
      </div>
      <div className="studio-preset-grid">
        {LAYOUT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="studio-preset-card"
            onClick={() => onSelect(preset.create())}
            title={preset.description}
          >
            <div className={`studio-preset-thumb ${preset.thumbnailClass}`} aria-hidden />
            <span className="studio-preset-label">{preset.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
