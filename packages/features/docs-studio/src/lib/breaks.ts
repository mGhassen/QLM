export type BreakVariant = "page" | "section" | "continue";

export const BREAK_VARIANTS: BreakVariant[] = ["page", "section", "continue"];

export const BREAK_LABELS: Record<BreakVariant, string> = {
  page: "Page break",
  section: "Section break",
  continue: "Continue break",
};

export const BREAK_DESCRIPTIONS: Record<BreakVariant, string> = {
  page: "Start a new page without section spacing.",
  section: "Start a new page with section top spacing.",
  continue: "Continue on a new page without section spacing.",
};

export function breakVariantToSectionProps(variant: BreakVariant | undefined): {
  pageBreak?: boolean;
  continuation?: boolean;
} {
  if (!variant) return {};
  switch (variant) {
    case "section":
      return { pageBreak: true, continuation: false };
    case "continue":
      return { pageBreak: false, continuation: true };
    case "page":
      return { pageBreak: false, continuation: false };
  }
}
