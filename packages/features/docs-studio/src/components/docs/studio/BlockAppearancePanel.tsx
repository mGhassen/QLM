"use client";

import ColorPicker from "./ColorPicker";
import { WfCheckRow, WfField, WfHint } from "./style/WfControls";

interface BlockAppearancePanelProps {
  blockType: string;
  props: Record<string, unknown>;
  onPropsChange: (props: Record<string, unknown>) => void;
  embedded?: boolean;
  variant?: "light" | "panel";
}

export default function BlockAppearancePanel({
  blockType,
  props,
  onPropsChange,
  embedded,
  variant = "light",
}: BlockAppearancePanelProps) {
  const setProp = (key: string, value: unknown) => onPropsChange({ ...props, [key]: value });
  const isPageZone = blockType === "section" || blockType === "cover";
  const radius = parseFloat(String(props.borderRadius ?? 0).replace("mm", "")) || 0;

  if (variant === "panel") {
    return (
      <>
        <ColorPicker
          variant="panel"
          label="Background"
          value={(props.backgroundColor as string) ?? ""}
          onChange={(c) => setProp("backgroundColor", c === "" ? undefined : c)}
        />
        {!isPageZone && (
          <>
            <WfCheckRow
              label="Full zone width"
              checked={!!props.bgFullWidth}
              onChange={(v) => setProp("bgFullWidth", v || undefined)}
            />
            <WfCheckRow
              label="Full zone height"
              checked={!!props.bgFullHeight}
              onChange={(v) => setProp("bgFullHeight", v || undefined)}
            />
          </>
        )}
        <WfField label={`Radius — ${radius}mm`}>
          <input
            type="range"
            min="0"
            max="12"
            step="0.5"
            value={radius}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setProp("borderRadius", v ? `${v}mm` : undefined);
            }}
            style={{ width: "100%", accentColor: "#146ef5" }}
          />
        </WfField>
      </>
    );
  }

  return (
    <div className={embedded ? "space-y-3" : "pt-3 mt-3 border-t border-border-subtle space-y-3"}>
      {!embedded && (
        <div className="text-[11px] font-medium text-muted-foreground/45 uppercase tracking-wide">Appearance</div>
      )}
      <ColorPicker
        label="Background"
        value={(props.backgroundColor as string) ?? ""}
        onChange={(c) => setProp("backgroundColor", c === "" ? undefined : c)}
      />
      {!isPageZone && (
        <>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={!!props.bgFullWidth}
              onChange={(e) => setProp("bgFullWidth", e.target.checked || undefined)}
            />
            Full zone width
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={!!props.bgFullHeight}
              onChange={(e) => setProp("bgFullHeight", e.target.checked || undefined)}
            />
            Full zone height
          </label>
        </>
      )}
      {isPageZone && (
        <p className="text-[10px] text-muted-foreground/35 leading-relaxed">
          Background fills the full {blockType} area.
        </p>
      )}
      <div>
        <label className="text-[11px] font-medium text-muted-foreground/50 block mb-1">
          Corner radius — {radius}mm
        </label>
        <input
          type="range"
          min="0"
          max="12"
          step="0.5"
          value={radius}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setProp("borderRadius", v ? `${v}mm` : undefined);
          }}
          className="w-full"
        />
      </div>
    </div>
  );
}
