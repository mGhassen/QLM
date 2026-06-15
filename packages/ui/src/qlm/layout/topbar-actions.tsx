import { useMemo, useState } from 'react';
import { BookOpen, Info, Sparkles } from 'lucide-react';

import { Button } from '../../shadcn/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../shadcn/tooltip';
import { cn } from '../../lib/utils';
import { HelpDialog } from './help-dialog';
import { createShellHelpSections } from './shell-help-sections';

export type ActivePanel = 'documentation' | 'assistant' | null;

type TopbarActionsProps = {
  activePanel: ActivePanel;
  onPanelChange: (panel: ActivePanel) => void;
};

export function TopbarActions({
  activePanel,
  onPanelChange,
}: Readonly<TopbarActionsProps>) {
  const [helpOpen, setHelpOpen] = useState(false);
  const helpSections = useMemo(() => createShellHelpSections(), []);

  function toggle(panel: 'documentation' | 'assistant') {
    onPanelChange(activePanel === panel ? null : panel);
  }

  return (
    <div className="flex items-center gap-1">
      {/* Help */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setHelpOpen(true)}
            >
              <Info className="h-4 w-4" />
              <span className="sr-only">Help</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Help</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Documentation */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7',
                activePanel === 'documentation' && 'bg-accent',
              )}
              onClick={() => toggle('documentation')}
            >
              <BookOpen className="h-4 w-4" />
              <span className="sr-only">Documentation</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Documentation</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* AI Assistant */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7',
                activePanel === 'assistant' && 'bg-accent',
              )}
              onClick={() => toggle('assistant')}
            >
              <Sparkles className="h-4 w-4" />
              <span className="sr-only">AI Assistant</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">AI Assistant</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <HelpDialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
        sections={helpSections}
      />
    </div>
  );
}
