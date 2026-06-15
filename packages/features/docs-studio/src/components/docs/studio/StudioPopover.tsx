"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import WysiwygEditor from "./WysiwygEditor";

const INLINE_TAGS = new Set(["span", "label", "a", "em", "strong", "b", "i", "small", "sub", "sup", "code"]);
const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

function resolveShell(tag: string, isSingle: boolean): string {
  if (!tag) return "div";
  if (isSingle && INLINE_TAGS.has(tag)) return "span";
  return tag;
}

interface StudioPopoverProps {
  editable?: boolean;
  value: string;
  onChange?: (value: string) => void;
  children: ReactNode;
  wysiwyg?: boolean;
  raw?: boolean;
  singleLine?: boolean;
  htmlOutput?: boolean;
  editing?: boolean;
  onActivate?: () => void;
}

export default function StudioPopover({
  editable,
  value,
  onChange,
  children,
  wysiwyg = true,
  raw,
  singleLine,
  htmlOutput,
  editing,
  onActivate,
}: StudioPopoverProps) {
  const [active, setActive] = useState(false);
  const pendingRef = useRef(value);
  const isEditing = active || !!editing;

  useEffect(() => {
    if (!editing) setActive(false);
  }, [editing]);

  if (!editable || !onChange) return <>{children}</>;

  const child = Children.only(children);
  if (!isValidElement(child)) return <>{children}</>;

  const childProps = child.props as {
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
    style?: React.CSSProperties;
  };
  const tag = typeof child.type === "string" ? child.type : "";
  const isSingle = singleLine ?? (INLINE_TAGS.has(tag) || HEADING_TAGS.has(tag) || tag === "p");
  const Shell = resolveShell(tag, isSingle) as ElementType;
  const shellClass = [childProps.className, "studio-inline-field"].filter(Boolean).join(" ");

  function activate() {
    onActivate?.();
    setActive(true);
  }

  if (!wysiwyg && raw) {
    return (
      <Shell
        className={shellClass}
        style={childProps.style}
        onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <textarea
          className="studio-popover-input"
          defaultValue={value}
          onFocus={() => {
            activate();
          }}
          onChange={(e) => {
            pendingRef.current = e.target.value;
          }}
          onBlur={() => {
            if (pendingRef.current !== value) onChange(pendingRef.current);
            setActive(false);
          }}
        />
      </Shell>
    );
  }

  if (!isEditing) {
    return cloneElement(child, {
      className: [childProps.className, "studio-inline-field", "studio-inline-field-idle"]
        .filter(Boolean)
        .join(" "),
      style: childProps.style,
      ...(tag ? { "data-as": tag } : {}),
    } as Record<string, unknown>);
  }

  return (
    <Shell
      className={shellClass}
      style={childProps.style}
      {...(tag ? { "data-as": tag } : {})}
    >
      <WysiwygEditor
        content={value}
        onChange={onChange}
        inline
        overlay={isEditing}
        singleLine={isSingle}
        htmlOutput={htmlOutput ?? !!raw}
        className={shellClass}
        active={isEditing}
        autoFocus={active}
        commitOnBlur
        onActivate={activate}
        onDeactivate={() => setActive(false)}
      />
    </Shell>
  );
}
