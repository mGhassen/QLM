import * as React from "react";

/** @deprecated React Flow viewport replaces scroll chrome; kept for Storybook compatibility. */
export type EnvironmentsCanvasChrome = {
  viewportRef: React.RefObject<HTMLDivElement | null>;
};

export const EnvironmentsCanvasChromeContext =
  React.createContext<EnvironmentsCanvasChrome | null>(null);

export function useEnvironmentsCanvasChrome() {
  return React.useContext(EnvironmentsCanvasChromeContext);
}
