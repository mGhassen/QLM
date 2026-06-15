import { ExternalLink, X } from 'lucide-react';

import { BotAvatar } from '@guepard/ui/bot-avatar';
import { Button } from '@guepard/ui/button';

export type PanelHeaderProps = {
  /** Show the "Open in new tab" button in the header. Defaults to true. */
  showOpenInTab?: boolean;
  /** Show the close button in the header. Defaults to true. */
  showClose?: boolean;
  /**
   * Click handler for the "Open in new tab" button. When defined the button
   * is enabled; when omitted (or when `showOpenInTab` is false) it is hidden
   * or disabled.
   */
  onOpenInTab?: () => void;
  /**
   * Click handler for the close button. When defined the button is enabled;
   * otherwise the button stays disabled as a visual placeholder. Phase 1
   * leaves this unwired; a later story will connect it to the shell panel
   * toggle.
   */
  onClose?: () => void;
};

/**
 * Shared header for `AssistantPanelBody` (right-side panel). Kept compact —
 * single row, small avatar, tight padding — so the conversation area gets
 * the vertical real estate.
 */
export function PanelHeader({
  showOpenInTab = true,
  showClose = true,
  onOpenInTab,
  onClose,
}: Readonly<PanelHeaderProps>) {
  return (
    <header className="flex h-9 shrink-0 items-center justify-between border-b px-3">
      <div className="flex min-w-0 items-center gap-2">
        <BotAvatar size={5} />
        <h2 className="truncate text-xs font-medium">
          Qwery Agent{' '}
          <span className="text-muted-foreground font-normal">
            · Conversation
          </span>
        </h2>
      </div>
      <div className="flex shrink-0 items-center">
        {showOpenInTab && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open in new tab"
            className="h-6 w-6"
            disabled={!onOpenInTab}
            onClick={onOpenInTab}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        )}
        {showClose && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            className="h-6 w-6"
            disabled={!onClose}
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </header>
  );
}
