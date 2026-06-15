import { useEffect } from 'react';

export type TabKeybindingHandlers = {
  onReopenClosedTab: () => void;
  onNavBack: () => void;
  onNavForward: () => void;
  onOpenMruSwitcher: () => void;
  onOpenQuickSwitcher: () => void;
};

/**
 * Mounts document-level tab keybindings:
 *   Ctrl+Shift+T      — reopen closed tab
 *   Alt+Left/Right    — nav back / forward
 *   Ctrl+`            — MRU tab switcher
 *   Ctrl+Shift+K      — quick tab search
 *
 * Skips when focus is inside an input / textarea / contenteditable
 * (except Ctrl+Shift+T and Alt+Left/Right which always fire).
 */
export function useTabKeybindings(handlers: TabKeybindingHandlers): void {
  useEffect(() => {
    function isEditing(e: KeyboardEvent): boolean {
      const t = e.target;
      if (!(t instanceof Element)) return false;
      const tag = (t as HTMLElement).tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (t as HTMLElement).isContentEditable ||
        !!t.closest('[data-codemirror-root]')
      );
    }

    function handleKeyDown(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl+Shift+T — reopen closed tab
      if (ctrl && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        handlers.onReopenClosedTab();
        return;
      }

      // Alt+Left / Alt+Right — nav back/forward
      if (e.altKey && !ctrl && e.key === 'ArrowLeft') {
        e.preventDefault();
        handlers.onNavBack();
        return;
      }
      if (e.altKey && !ctrl && e.key === 'ArrowRight') {
        e.preventDefault();
        handlers.onNavForward();
        return;
      }

      if (isEditing(e)) return;

      // Ctrl+` — MRU switcher
      if (ctrl && !e.shiftKey && e.key === '`') {
        e.preventDefault();
        handlers.onOpenMruSwitcher();
        return;
      }

      // Ctrl+Shift+K — quick tab search
      if (ctrl && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        handlers.onOpenQuickSwitcher();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
