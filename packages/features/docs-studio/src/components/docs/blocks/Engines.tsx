import MarkdownContent from "./MarkdownContent";

export default function Engines({
  content = "",
  editable,
  editing,
  onChange,
  onActivate,
}: {
  content?: string;
  editable?: boolean;
  editing?: boolean;
  onChange?: (content: string) => void;
  onActivate?: () => void;
}) {
  return (
    <div className="engines">
      <MarkdownContent content={content} editable={editable} editing={editing} onChange={onChange} onActivate={onActivate} />
    </div>
  );
}
