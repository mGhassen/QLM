import MarkdownContent from "./MarkdownContent";
import type { BlockNode } from "#/lib/types";

interface ParagraphProps {
  content?: string;
  className?: string;
  justify?: boolean;
  editable?: boolean;
  editing?: boolean;
  blockId?: string;
  onChange?: (content: string) => void;
  onActivate?: () => void;
  onInsertAfter?: (block: BlockNode) => void;
}

export default function Paragraph({
  content = "",
  className,
  justify,
  editable,
  editing,
  blockId,
  onChange,
  onActivate,
  onInsertAfter,
}: ParagraphProps) {
  return (
    <div className={className} style={justify ? { textAlign: "justify", hyphens: "auto" } : undefined}>
      <MarkdownContent
        content={content}
        editable={editable}
        editing={editing}
        blockId={blockId}
        onChange={onChange}
        onActivate={onActivate}
        onInsertAfter={onInsertAfter}
      />
    </div>
  );
}
