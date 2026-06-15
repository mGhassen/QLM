"use client";

import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { blockRegistry } from "#/lib/blockRegistry";
import type { BlockNode } from "#/lib/types";

export default function DesignBlockNodeView({ node, selected }: NodeViewProps) {
  const blockType = node.attrs.blockType as string;
  const content = node.attrs.content as string;
  let props: Record<string, unknown> = {};
  try {
    props = JSON.parse(node.attrs.propsJson as string);
  } catch {
    props = {};
  }

  const block: BlockNode = {
    id: node.attrs.blockId as string,
    type: blockType as BlockNode["type"],
    props,
    content,
  };

  const Component = blockRegistry[block.type];
  if (!Component) {
    return (
      <NodeViewWrapper className={`design-block-node${selected ? " selected" : ""}`}>
        <div className="design-block-fallback">[{blockType}]</div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={`design-block-node${selected ? " selected" : ""}`}
      data-design-block-view
    >
      <Component {...(props as Record<string, unknown>)} content={content} />
    </NodeViewWrapper>
  );
}
