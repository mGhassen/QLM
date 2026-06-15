import { useId } from "react";

export function EnvironmentsCanvasDotGrid() {
  const uid = useId().replace(/:/g, "");
  const patternId = `env-canvas-dots-${uid}`;
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full text-env-grid-dot"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={patternId} x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
