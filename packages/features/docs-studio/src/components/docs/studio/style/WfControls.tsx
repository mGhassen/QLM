"use client";

import type { ReactNode } from "react";

export function WfField({
  label,
  labelTone = "accent",
  children,
  className,
}: {
  label?: string;
  labelTone?: "accent" | "neutral";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`wf-field${className ? ` ${className}` : ""}`}>
      {label && (
        <span className={`wf-field-label${labelTone === "neutral" ? " neutral" : ""}`}>{label}</span>
      )}
      {children}
    </div>
  );
}

export function WfFieldRow({ children }: { children: ReactNode }) {
  return <div className="wf-field-row">{children}</div>;
}

export function WfInput({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`wf-input${className ? ` ${className}` : ""}`}
    />
  );
}

export function WfSelect({
  value,
  onChange,
  children,
}: {
  value: string | number;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="wf-select">
      {children}
    </select>
  );
}

export function WfSegmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="wf-segmented">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`wf-segment${value === opt ? " active" : ""}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function WfStepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="wf-stepper">
      <button type="button" className="wf-stepper-btn" onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <span className="wf-stepper-value">{value}</span>
      <button type="button" className="wf-stepper-btn" onClick={() => onChange(Math.min(max, value + 1))}>
        +
      </button>
    </div>
  );
}

export function WfGapControl({
  label,
  value,
  max = 24,
  unit = "mm",
  onChange,
}: {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <WfField label={label}>
      <div className="wf-gap-row">
        <input
          type="range"
          min={0}
          max={max}
          step={0.5}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <WfInput
          value={`${value} ${unit}`}
          className="wf-gap-value num"
          onChange={(raw) => {
            const n = parseFloat(raw);
            if (!Number.isNaN(n)) onChange(Math.max(0, Math.min(max, n)));
          }}
        />
      </div>
    </WfField>
  );
}

export function WfCheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="wf-check-row">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function WfHint({ children }: { children: ReactNode }) {
  return <p className="wf-hint">{children}</p>;
}
