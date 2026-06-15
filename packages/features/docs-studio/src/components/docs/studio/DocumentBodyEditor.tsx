'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import { useEffect, useId, useRef, useState } from 'react';
import { BlockStyle } from '#/lib/tiptap-block-style';
import { DesignBlock } from '#/lib/tiptap/design-block';
import { bodyToEditorHtml, editorHtmlToBody } from '#/lib/body-markdoc';
import { createBlock } from '#/lib/serialize';
import { BODY_SLASH_CATEGORIES } from '#/lib/palette';
import { pauseDocLayout, resumeDocLayout } from '#/lib/layout-pause';
import EditorToolbar from './EditorToolbar';
import SlashInsertMenu from './SlashInsertMenu';
import type { BlockNode } from '#/lib/types';

interface DocumentBodyEditorProps {
  body: string;
  onChange: (body: string) => void;
  autoFocus?: boolean;
  className?: string;
  onLayoutChange?: () => void;
}

export default function DocumentBodyEditor({
  body,
  onChange,
  autoFocus = false,
  className,
  onLayoutChange,
}: DocumentBodyEditorProps) {
  const fieldId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(body);
  const onLayoutChangeRef = useRef(onLayoutChange);
  onLayoutChangeRef.current = onLayoutChange;
  const syncBodyRef = useRef<(html: string) => void>(() => {});
  syncBodyRef.current = (html: string) => {
    const next = editorHtmlToBody(html);
    pendingRef.current = next;
    onChange(next);
    onLayoutChangeRef.current?.();
  };
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashAnchor, setSlashAnchor] = useState<DOMRect | null>(null);

  const editor = useEditor(
    {
      immediatelyRender: false,
      autofocus: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { class: 'doc-link' },
        }),
        Placeholder.configure({ placeholder: 'Start typing…' }),
        TextStyle,
        Color,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        BlockStyle,
        DesignBlock,
      ],
      content: bodyToEditorHtml(body),
      editorProps: {
        attributes: {
          class: `studio-wysiwyg studio-doc-body-editor outline-none ${className ?? ''}`,
        },
        handleKeyDown: (view, event) => {
          if (event.key === '/' && !event.metaKey && !event.ctrlKey) {
            const { from, empty } = view.state.selection;
            const textBefore = view.state.doc.textBetween(0, from, '\n', '\0');
            const atBlockStart =
              !textBefore || textBefore.endsWith('\n') || from <= 1;
            if (empty && atBlockStart) {
              event.preventDefault();
              const coords = view.coordsAtPos(from);
              setSlashAnchor(
                new DOMRect(
                  coords.left,
                  coords.top,
                  0,
                  coords.bottom - coords.top,
                ),
              );
              setSlashQuery('');
              setSlashOpen(true);
              return true;
            }
          }
          if (
            slashOpen &&
            event.key.length === 1 &&
            !event.metaKey &&
            !event.ctrlKey
          ) {
            if (event.key === ' ') {
              setSlashOpen(false);
            } else if (event.key !== '/') {
              setSlashQuery((q: string) => q + event.key);
            }
          }
          return false;
        },
      },
      onUpdate: ({ editor: ed }) => {
        pauseDocLayout();
        syncBodyRef.current(ed.getHTML());
        resumeDocLayout();
      },
    },
    [],
  );

  useEffect(() => {
    pendingRef.current = body;
    if (!editor || editor.isDestroyed || !editor.schema || editor.isFocused)
      return;
    const current = editorHtmlToBody(editor.getHTML());
    if (current !== body) {
      editor.commands.setContent(bodyToEditorHtml(body), { emitUpdate: false });
    }
  }, [body, editor]);

  useEffect(() => {
    if (autoFocus && editor && !editor.isDestroyed && editor.schema) {
      editor.commands.focus('end');
    }
  }, [autoFocus, editor]);

  function insertDesignBlock(block: BlockNode) {
    if (!editor) return;
    const created = createBlock(block.type, {
      content: block.content,
      props: block.props,
      children: block.children,
    });
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'designBlock',
        attrs: {
          blockType: created.type,
          blockId: created.id,
          propsJson: JSON.stringify(created.props ?? {}),
          content: created.content ?? '',
        },
      })
      .run();
    setSlashOpen(false);
  }

  if (!editor) {
    return (
      <div
        ref={wrapRef}
        className="studio-doc-body-editor-wrap"
        data-field-editor={fieldId}
        dangerouslySetInnerHTML={{ __html: bodyToEditorHtml(body) }}
      />
    );
  }

  return (
    <div
      ref={wrapRef}
      className="studio-doc-body-editor-wrap"
      data-field-editor={fieldId}
      data-doc-body-editor
      onMouseDown={(e) => {
        e.stopPropagation();
        if (!editor.isFocused) editor.commands.focus('end');
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <BubbleMenu
        editor={editor}
        options={{ placement: 'top', strategy: 'absolute' }}
      >
        <EditorToolbar editor={editor} floating />
      </BubbleMenu>
      <SlashInsertMenu
        open={slashOpen}
        query={slashQuery}
        anchorRect={slashAnchor}
        categories={BODY_SLASH_CATEGORIES}
        onInsert={insertDesignBlock}
        onClose={() => setSlashOpen(false)}
      />
      <EditorContent editor={editor} />
    </div>
  );
}
