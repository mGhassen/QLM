import { Mark, mergeAttributes } from "@tiptap/core";

export const BrandSub = Mark.create({
  name: "brandSub",
  inclusive: true,
  parseHTML() {
    return [{ tag: "span[class~='brand-sub']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "brand-sub" }), 0];
  },
});
