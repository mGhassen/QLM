export const FIELD_EDITOR_PORTAL_SELECTOR =
  '[data-field-editor], .studio-wysiwyg-toolbar-dock, .studio-wysiwyg-toolbar-portal, [data-tiptap-bubble-menu], .tiptap-bubble-menu, .studio-editor-toolbar, [data-studio-chrome]';

export function shouldCloseFieldEditor(
  container: Node,
  relatedTarget: EventTarget | null,
  fieldId: string,
): boolean {
  if (!relatedTarget) return true;
  if (container.contains(relatedTarget as Node)) return false;
  if (!(relatedTarget instanceof Element)) return true;
  if (relatedTarget.closest(`[data-field-editor="${fieldId}"]`)) return false;
  if (relatedTarget.closest(FIELD_EDITOR_PORTAL_SELECTOR)) return false;
  return true;
}
