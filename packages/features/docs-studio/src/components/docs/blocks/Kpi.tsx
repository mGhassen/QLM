"use client";

import StudioPopover from "../studio/StudioPopover";

interface KpiProps {
  value?: string;
  label?: string;
  editable?: boolean;
  onPropChange?: (key: string, value: unknown) => void;
  onActivate?: () => void;
}

export default function Kpi({ value, label, editable, onPropChange, onActivate }: KpiProps) {
  return (
    <div className="kpi">
      {(value || editable) && (
        <StudioPopover
          editable={editable}
          value={value ?? ""}
          onChange={(v) => onPropChange?.("value", v)}
          singleLine
          onActivate={onActivate}
        >
          <div className="n">{value}</div>
        </StudioPopover>
      )}
      {(label || editable) && (
        <StudioPopover
          editable={editable}
          value={label ?? ""}
          onChange={(v) => onPropChange?.("label", v)}
          singleLine
          onActivate={onActivate}
        >
          <div className="l">{label}</div>
        </StudioPopover>
      )}
    </div>
  );
}
