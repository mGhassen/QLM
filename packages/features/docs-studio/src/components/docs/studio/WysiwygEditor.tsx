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
import { BlockStyle } from '#/lib/tiptap-block-style';
import { BrandSub } from '#/lib/tiptap-brand-sub';
import { useEffect, useCallback, useId, useRef, useState } from 'react';
import { markdownToHtml, htmlToMarkdown } from '#/lib/markdown-editor';
import { shouldCloseFieldEditor } from '#/lib/studio-field-focus';
import EditorToolbar from './EditorToolbar';
import FloatingToolbarSlot from './FloatingToolbarSlot';
import SlashInsertMenu from './SlashInsertMenu';
import type { BlockNode } from '#/lib/types';

interface WysiwygEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  placeholder?: string;
  showToolbar?: boolean;
  overlay?: boolean;
  inline?: boolean;
  singleLine?: boolean;
  htmlOutput?: boolean;
  active?: boolean;
  autoFocus?: boolean;
  commitOnBlur?: boolean;
  blockId?: string;
  onInsertAfter?: (block: BlockNode) => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
}

function toEditorHtml(content: string, htmlOutput?: boolean): string {
  const trimmed = content.trim();
  if (!trimmed) return '<p></p>';
  if (htmlOutput || trimmed.startsWith('<')) return trimmed;
  if (/<[a-z][^>]*>/i.test(content)) return `<p>${content}</p>`;
  return markdownToHtml(content);
}

function fromEditorHtml(html: string, htmlOutput?: boolean): string {
  if (htmlOutput) return html;
  return htmlToMarkdown(html);
}

function htmlPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function WysiwygEditorActive({
  content,
  onChange,
  className,
  placeholder = 'Start typing…',
  showToolbar = true,
  overlay = false,
  inline = false,
  singleLine = false,
  htmlOutput = false,
  active = true,
  autoFocus = false,
  commitOnBlur = true,
  blockId,
  onInsertAfter,
  onActivate,
  onDeactivate,
}: WysiwygEditorProps) {
  const fieldId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const onDeactivateRef = useRef(onDeactivate);
  const pendingRef = useRef(content);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashAnchor, setSlashAnchor] = useState<DOMRect | null>(null);
  onDeactivateRef.current = onDeactivate;

  const syncContent = useCallback(
    (html: string) => {
      const next = fromEditorHtml(html, htmlOutput);
      pendingRef.current = next;
      if (!commitOnBlur) onChange(next);
    },
    [onChange, htmlOutput, commitOnBlur],
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: active,
      autofocus: false,
      extensions: [
        StarterKit.configure({
          heading: singleLine ? false : { levels: [2, 3] },
          bulletList: singleLine ? false : undefined,
          orderedList: singleLine ? false : undefined,
          blockquote: singleLine ? false : undefined,
          codeBlock: singleLine ? false : undefined,
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { class: 'doc-link' },
        }),
        Placeholder.configure({ placeholder }),
        TextStyle,
        Color,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        BlockStyle,
        BrandSub,
      ],
      content: toEditorHtml(content, htmlOutput),
      editorProps: {
        attributes: {
          class: `studio-wysiwyg outline-none ${className ?? ''}`,
          ...(active ? {} : { 'data-readonly': 'true' }),
        },
        handleKeyDown: (view, event) => {
          if (singleLine && event.key === 'Enter') {
            event.preventDefault();
            return true;
          }
          if (
            onInsertAfter &&
            event.key === '/' &&
            !event.metaKey &&
            !event.ctrlKey
          ) {
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
        syncContent(ed.getHTML());
      },
      onBlur: ({ event, editor: ed }) => {
        if (commitOnBlur) {
          const next = fromEditorHtml(ed.getHTML(), htmlOutput);
          pendingRef.current = next;
          if (next !== content) onChange(next);
        }
        if (!onDeactivateRef.current) return;
        if (
          !event.currentTarget ||
          !shouldCloseFieldEditor(
            event.currentTarget as Node,
            event.relatedTarget as Node | null,
            fieldId,
          )
        )
          return;
        onDeactivateRef.current();
      },
    },
    [singleLine, htmlOutput, placeholder, fieldId, commitOnBlur],
  );

  useEffect(() => {
    if (editor) editor.setEditable(active);
  }, [editor, active]);

  useEffect(() => {
    pendingRef.current = content;
    if (editor && !editor.isFocused) {
      const current = fromEditorHtml(editor.getHTML(), htmlOutput);
      const differs = htmlOutput
        ? htmlPlainText(current) !== htmlPlainText(content)
        : current !== content;
      if (differs) {
        editor.commands.setContent(toEditorHtml(content, htmlOutput), {
          emitUpdate: false,
        });
      }
    }
  }, [content, editor, htmlOutput]);

  useEffect(() => {
    if (active && autoFocus && editor) {
      editor.commands.focus('end');
    }
  }, [active, autoFocus, editor]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !editor) return;
    function onSelectAll() {
      editor?.chain().focus().selectAll().run();
    }
    wrap.addEventListener('studio-select-all', onSelectAll);
    return () => wrap.removeEventListener('studio-select-all', onSelectAll);
  }, [editor]);

  if (!editor) {
    return (
      <div
        className={[
          'studio-wysiwyg-wrap',
          inline ? 'studio-wysiwyg-inline' : '',
          singleLine ? 'studio-wysiwyg-single' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        data-field-editor={fieldId}
        dangerouslySetInnerHTML={{ __html: toEditorHtml(content, htmlOutput) }}
      />
    );
  }

  const showStaticToolbar = showToolbar && !inline && !overlay;
  const showBlockToolbar = overlay && active;
  const showBubbleToolbar = inline && !overlay && active;

  return (
    <div
      ref={wrapRef}
      className={[
        'studio-wysiwyg-wrap',
        inline ? 'studio-wysiwyg-inline' : '',
        overlay ? 'studio-wysiwyg-overlay-mode' : '',
        singleLine ? 'studio-wysiwyg-single' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-field-editor={fieldId}
      onMouseDown={(e) => {
        if (!active) onActivate?.();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {showStaticToolbar && <EditorToolbar editor={editor} />}
      {showBlockToolbar && (
        <FloatingToolbarSlot>
          <EditorToolbar editor={editor} anchored />
        </FloatingToolbarSlot>
      )}
      {showBubbleToolbar && (
        <BubbleMenu
          editor={editor}
          options={{ placement: 'top', strategy: 'absolute' }}
        >
          <EditorToolbar editor={editor} floating />
        </BubbleMenu>
      )}
      {onInsertAfter && (
        <SlashInsertMenu
          open={slashOpen}
          query={slashQuery}
          anchorRect={slashAnchor}
          onInsert={(block) => {
            onInsertAfter(block);
            setSlashOpen(false);
            onDeactivateRef.current?.();
          }}
          onClose={() => setSlashOpen(false)}
        />
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

export default function WysiwygEditor({
  active = true,
  content,
  className,
  inline,
  singleLine,
  htmlOutput,
  onActivate,
  ...props
}: WysiwygEditorProps) {
  if (!active) {
    return (
      <div
        className={[
          'studio-wysiwyg-wrap studio-wysiwyg-idle',
          inline ? 'studio-wysiwyg-inline' : '',
          singleLine ? 'studio-wysiwyg-single' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        dangerouslySetInnerHTML={{ __html: toEditorHtml(content, htmlOutput) }}
        onMouseDown={(e) => {
          onActivate?.();
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <WysiwygEditorActive
      active={active}
      content={content}
      className={className}
      inline={inline}
      singleLine={singleLine}
      htmlOutput={htmlOutput}
      onActivate={onActivate}
      {...props}
    />
  );
}
