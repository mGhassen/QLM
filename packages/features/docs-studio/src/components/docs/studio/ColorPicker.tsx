"use client";

const TRANSPARENT = "transparent";

const PRESETS = [
  "#ffcb51",
  "#161616",
  "#ffffff",
  "#c0392b",
  "#2f7d4f",
  "#6a9955",
  "#a67c12",
  "#5a5a5a",
  "#f2f2f2",
  "#e8e8e6",
  "#e8a8a2",
  "#b8b8b8",
];

interface ColorPickerProps {
  label?: string;
  value?: string;
  onChange: (color: string) => void;
  variant?: "light" | "panel";
}

export default function ColorPicker({ label, value, onChange, variant = "light" }: ColorPickerProps) {
  if (variant === "panel") {
    return (
      <div className="wf-field">
        {label && <span className="wf-field-label">{label}</span>}
        <div className="wf-color-presets">
          {PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => onChange(c)}
              className={`wf-color-swatch${value === c ? " active" : ""}`}
              style={{ background: c }}
            />
          ))}
          <button
            type="button"
            title="Transparent"
            onClick={() => onChange(TRANSPARENT)}
            className={`wf-color-swatch${value === TRANSPARENT ? " active" : ""}`}
            style={{
              background:
                "repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 6px 6px",
            }}
          />
          <button
            type="button"
            title="Default"
            onClick={() => onChange("")}
            className="wf-color-swatch"
            style={{ fontSize: 9, color: "rgba(0,0,0,0.45)" }}
          >
            ∅
          </button>
        </div>
        <input
          type="color"
          value={value || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="wf-color-input"
        />
      </div>
    );
  }

  return (
    <div>
      {label && <label className="text-muted-foreground mb-1.5 block text-xs font-medium">{label}</label>}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => onChange(c)}
            className={`w-6 h-6 border-2 transition-transform hover:scale-110 ${
              value === c ? "border-primary ring-primary ring-1" : "border-border"
            }`}
            style={{ background: c, borderRadius: 2 }}
          />
        ))}
        <button
          type="button"
          title="Transparent"
          onClick={() => onChange(TRANSPARENT)}
          className={`w-6 h-6 border-2 ${
            value === TRANSPARENT ? "border-primary ring-primary ring-1" : "border-border"
          }`}
          style={{
            borderRadius: 2,
            background:
              "repeating-conic-gradient(#d4d4d4 0% 25%, #fff 0% 50%) 50% / 8px 8px",
          }}
        />
        <button
          type="button"
          title="Default"
          onClick={() => onChange("")}
          className="border-border text-muted-foreground h-6 w-6 border-2 border-dashed text-[10px]"
          style={{ borderRadius: 2 }}
        >
          ∅
        </button>
      </div>
      <input
        type="color"
        value={value || "#ffffff"}
        onChange={(e) => onChange(e.target.value)}
        className="border-border h-8 w-full cursor-pointer border"
        style={{ borderRadius: 2 }}
      />
    </div>
  );
}
