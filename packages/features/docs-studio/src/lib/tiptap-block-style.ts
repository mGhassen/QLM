import { Extension } from "@tiptap/core";

export const BlockStyle = Extension.create({
  name: "blockStyle",

  addGlobalAttributes() {
    const spacingAttrs = {
      lineHeight: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.lineHeight || null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
      },
      marginTop: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.marginTop || null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.marginTop ? { style: `margin-top: ${attrs.marginTop}` } : {},
      },
      marginBottom: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.marginBottom || null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.marginBottom ? { style: `margin-bottom: ${attrs.marginBottom}` } : {},
      },
    };

    const listAttrs = {
      paddingLeft: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.paddingLeft || null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.paddingLeft ? { style: `padding-left: ${attrs.paddingLeft}` } : {},
      },
      paddingTop: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.paddingTop || null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.paddingTop ? { style: `padding-top: ${attrs.paddingTop}` } : {},
      },
      paddingBottom: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.paddingBottom || null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.paddingBottom ? { style: `padding-bottom: ${attrs.paddingBottom}` } : {},
      },
      marginTop: spacingAttrs.marginTop,
      marginBottom: spacingAttrs.marginBottom,
    };

    return [
      { types: ["paragraph", "heading"], attributes: spacingAttrs },
      { types: ["bulletList", "orderedList"], attributes: listAttrs },
    ];
  },
});
