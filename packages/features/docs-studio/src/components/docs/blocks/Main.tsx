import MarkdownContent from './MarkdownContent';
import type { BlockNode } from '#/lib/types';

interface MainProps {
  content?: string;
  children?: React.ReactNode;
  editable?: boolean;
  editing?: boolean;
  blockId?: string;
  onChange?: (content: string) => void;
  onActivate?: () => void;
  onInsertAfter?: (block: BlockNode) => void;
}

export default function Main({
  content,
  children,
  editable,
  editing,
  blockId,
  onChange,
  onActivate,
  onInsertAfter,
}: MainProps) {
  return (
    <div className="main">
      {children}
      {content ? (
        <MarkdownContent
          content={content}
          editable={editable}
          editing={editing}
          blockId={blockId}
          onChange={onChange}
          onActivate={onActivate}
          onInsertAfter={onInsertAfter}
        />
      ) : null}
    </div>
  );
}
