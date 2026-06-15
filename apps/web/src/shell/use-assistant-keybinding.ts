import { useEffect, type Dispatch, type SetStateAction } from 'react';

import type { ActivePanel } from '@guepard/ui/layout';

/**
 * Toggle the assistant panel via CMD/CTRL + L. Mirrors the established
 * `packages/ui/src/shadcn/sidebar.tsx` keybinding pattern (CMD+B for the
 * left sidebar). Mounted inside `ProjectShellHost`, which only renders on
 * `/prj/*` routes — the listener naturally never registers on `/org/*` or
 * `/auth/*` because the host doesn't render there.
 *
 * Bails out (without `preventDefault`) when the keystroke originates inside a
 * CodeMirror editor surface so the editor's own behaviour is preserved.
 */
export function useAssistantKeybinding(
  setActivePanel: Dispatch<SetStateAction<ActivePanel>>,
): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== 'l') return;

      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('[data-codemirror-root]')
      ) {
        return;
      }

      event.preventDefault();
      setActivePanel((prev) => (prev === 'assistant' ? null : 'assistant'));
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActivePanel]);
}
