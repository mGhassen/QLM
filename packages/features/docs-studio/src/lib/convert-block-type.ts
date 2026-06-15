import type { BlockNode, BlockType } from "./types";

export const CONVERTIBLE_TEXT_TYPES: BlockType[] = [
  "paragraph",
  "subheading",
  "quote",
  "opener",
  "seclabel",
  "pat",
];

export function isConvertibleTextBlock(type: BlockType): boolean {
  return CONVERTIBLE_TEXT_TYPES.includes(type);
}

export function convertBlockType(block: BlockNode, newType: BlockType): BlockNode {
  const content = block.content ?? "";
  const { id } = block;

  switch (newType) {
    case "paragraph":
      return { id, type: "paragraph", content };
    case "subheading":
      return {
        id,
        type: "subheading",
        content,
        props: { level: block.type === "subheading" ? (block.props?.level as number) ?? 2 : 2 },
      };
    case "quote":
      return { id, type: "quote", content };
    case "opener":
      return {
        id,
        type: "opener",
        content,
        props: block.type === "opener" ? block.props : {},
      };
    case "seclabel":
      return { id, type: "seclabel", content };
    case "pat":
      return {
        id,
        type: "pat",
        content,
        props: block.type === "pat" ? block.props : {},
      };
    default:
      return block;
  }
}
