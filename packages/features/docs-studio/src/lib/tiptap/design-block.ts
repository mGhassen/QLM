import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import DesignBlockNodeView from '#/components/docs/studio/DesignBlockNodeView';

export interface DesignBlockAttrs {
  blockType: string;
  blockId: string;
  propsJson: string;
  content: string;
}

export const DesignBlock = Node.create({
  name: 'designBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      blockType: { default: 'card' },
      blockId: { default: '' },
      propsJson: { default: '{}' },
      content: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-design-block="true"]',
        getAttrs: (el) => {
          if (typeof el === 'string') return false;
          const node = el as HTMLElement;
          return {
            blockType: node.getAttribute('data-block-type') ?? 'card',
            blockId: node.getAttribute('data-block-id') ?? '',
            propsJson: node.getAttribute('data-props-json') ?? '{}',
            content: node.getAttribute('data-content') ?? '',
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-design-block': 'true',
        'data-block-type': node.attrs.blockType,
        'data-block-id': node.attrs.blockId,
        'data-props-json': node.attrs.propsJson,
        'data-content': node.attrs.content,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DesignBlockNodeView);
  },
});

export function designBlockAttrs(
  blockType: string,
  content: string,
  props?: Record<string, unknown>,
  blockId?: string,
): DesignBlockAttrs {
  return {
    blockType,
    blockId: blockId ?? `design-${Date.now()}`,
    propsJson: JSON.stringify(props ?? {}),
    content,
  };
}
