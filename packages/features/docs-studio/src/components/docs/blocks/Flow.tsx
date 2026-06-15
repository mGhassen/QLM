import MarkdownContent from './MarkdownContent';
import type { BlockNode } from '#/lib/types';

interface FlowProps {
  content?: string;
  editable?: boolean;
  editing?: boolean;
  blockId?: string;
  onChange?: (content: string) => void;
  onActivate?: () => void;
  onInsertAfter?: (block: BlockNode) => void;
}

export default function Flow({
  content = '',
  editable,
  editing,
  blockId,
  onChange,
  onActivate,
  onInsertAfter,
}: FlowProps) {
  return (
    <div className="flow">
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
