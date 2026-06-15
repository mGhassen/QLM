"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  Unlink,
} from "lucide-react";
import {
  LINE_HEIGHTS,
  LIST_PADDING,
  VERTICAL_SPACING,
  selectToolbarState,
  setBlockAttr,
} from "#/lib/tiptap-toolbar";
import { titleWithShortcut } from "#/lib/studio-shortcuts";

interface EditorToolbarProps {
  editor: Editor;
  floating?: boolean;
  anchored?: boolean;
}

function Btn({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`rounded-none p-1.5 transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function MiniSelect({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      title={title}
      value={value}
      onMouseDown={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      className="border-border bg-background text-foreground h-7 max-w-18 rounded-none border px-1 text-[10px]"
    >
      {options.map((o) => (
        <option key={`${title}-${o.value}`} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function EditorToolbar({ editor, floating, anchored }: EditorToolbarProps) {
  const state = useEditorState({ editor, selector: selectToolbarState });

  function setLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  const {
    isBold,
    isItalic,
    isUnderline,
    isStrike,
    isH2,
    isH3,
    isBulletList,
    isOrderedList,
    isAlignLeft,
    isAlignCenter,
    isAlignRight,
    isAlignJustify,
    isLink,
    textColor,
    inList,
    lineHeight,
    marginTop,
    marginBottom,
    paddingLeft,
    paddingTop,
    paddingBottom,
  } = state;

  const shellClass = [
    "studio-editor-toolbar flex items-center gap-0.5",
    anchored || floating ? "flex-nowrap shrink-0 w-max" : "flex-wrap",
    anchored
      ? "anchored border-border bg-popover rounded-none border px-1 py-0.5 shadow-lg"
      : floating
        ? "floating border-border bg-popover rounded-none border px-1 py-0.5 shadow-lg"
        : "border-border bg-muted/35 border-b px-2 py-1",
  ].join(" ");

  return (
    <div className={shellClass} onClick={(e) => e.stopPropagation()}>
      <Btn
        title={titleWithShortcut("Bold", "Mod+B")}
        active={isBold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={14} />
      </Btn>
      <Btn
        title={titleWithShortcut("Italic", "Mod+I")}
        active={isItalic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={14} />
      </Btn>
      <Btn
        title={titleWithShortcut("Underline", "Mod+U")}
        active={isUnderline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline size={14} />
      </Btn>
      <Btn
        title={titleWithShortcut("Strikethrough", "Mod+Shift+S")}
        active={isStrike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={14} />
      </Btn>

      <span className="bg-border mx-0.5 h-4 w-px" />

      <Btn
        title="Heading 2"
        active={isH2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={14} />
      </Btn>
      <Btn
        title="Heading 3"
        active={isH3}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={14} />
      </Btn>

      <span className="bg-border mx-0.5 h-4 w-px" />

      <Btn
        title="Bullet list"
        active={isBulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={14} />
      </Btn>
      <Btn
        title="Ordered list"
        active={isOrderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={14} />
      </Btn>

      <span className="bg-border mx-0.5 h-4 w-px" />

      <Btn
        title="Align left"
        active={isAlignLeft}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft size={14} />
      </Btn>
      <Btn
        title="Align center"
        active={isAlignCenter}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter size={14} />
      </Btn>
      <Btn
        title="Align right"
        active={isAlignRight}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight size={14} />
      </Btn>
      <Btn
        title="Justify"
        active={isAlignJustify}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify size={14} />
      </Btn>

      <span className="bg-border mx-0.5 h-4 w-px" />

      {!inList && (
        <MiniSelect
          title="Line height"
          value={lineHeight}
          options={LINE_HEIGHTS}
          onChange={(v) => setBlockAttr(editor, "lineHeight", v)}
        />
      )}
      {inList && (
        <>
          <MiniSelect
            title="List indent"
            value={paddingLeft}
            options={LIST_PADDING}
            onChange={(v) => setBlockAttr(editor, "paddingLeft", v)}
          />
          <MiniSelect
            title="List pad top"
            value={paddingTop}
            options={VERTICAL_SPACING}
            onChange={(v) => setBlockAttr(editor, "paddingTop", v)}
          />
          <MiniSelect
            title="List pad bottom"
            value={paddingBottom}
            options={VERTICAL_SPACING}
            onChange={(v) => setBlockAttr(editor, "paddingBottom", v)}
          />
        </>
      )}
      <MiniSelect
        title="Space before"
        value={marginTop}
        options={VERTICAL_SPACING}
        onChange={(v) => setBlockAttr(editor, "marginTop", v)}
      />
      <MiniSelect
        title="Space after"
        value={marginBottom}
        options={VERTICAL_SPACING}
        onChange={(v) => setBlockAttr(editor, "marginBottom", v)}
      />

      <span className="bg-border mx-0.5 h-4 w-px" />

      <input
        type="color"
        title="Text color"
        className="w-6 h-6 p-0 border-0 rounded cursor-pointer bg-transparent"
        value={textColor}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
      />
      <Btn title="Clear color" onClick={() => editor.chain().focus().unsetColor().run()}>
        <span className="text-[10px] font-medium">A</span>
      </Btn>

      <span className="bg-border mx-0.5 h-4 w-px" />

      <Btn title="Link" active={isLink} onClick={setLink}>
        <Link2 size={14} />
      </Btn>
      {isLink && (
        <Btn title="Remove link" onClick={() => editor.chain().focus().unsetLink().run()}>
          <Unlink size={14} />
        </Btn>
      )}
    </div>
  );
}
