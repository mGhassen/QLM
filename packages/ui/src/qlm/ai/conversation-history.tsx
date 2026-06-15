'use client';

import { useState } from 'react';
import { CommandDialog } from '../../shadcn/command';
import { Button } from '../../shadcn/button';
import { cn } from '../../lib/utils';
import { type Conversation } from './utils/conversation-utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../shadcn/sheet';
import { Clock } from 'lucide-react';

export type { Conversation };

export interface ConversationHistoryProps {
  conversations?: Conversation[];
  isLoading?: boolean;
  currentConversationId?: string;
  isProcessing?: boolean;
  processingConversationSlug?: string;
  onConversationSelect?: (conversationId: string) => void;
  onNewConversation?: () => void;
  onConversationEdit?: (conversationId: string, newTitle: string) => void;
  onConversationDelete?: (conversationId: string) => void;
  onConversationsDelete?: (conversationIds: string[]) => void;
  /**
   * How to display the history
   * @default 'dialog'
   */
  displayMode?: 'dialog' | 'sheet';
  /**
   * The visual style of the trigger button
   * @default 'icon'
   */
  triggerVariant?: 'icon' | 'pill' | 'ghost';
  /**
   * Side for sheet mode
   * @default 'right'
   */
  side?: 'left' | 'right';
}

import { ConversationList } from './conversation-list';

export function ConversationHistory({
  displayMode = 'dialog',
  triggerVariant = 'icon',
  side = 'right',
  ...props
}: ConversationHistoryProps) {
  const [open, setOpen] = useState(false);

  const trigger = (
    <div className="flex">
      <Button
        variant={triggerVariant === 'ghost' ? 'ghost' : 'outline'}
        size={triggerVariant === 'icon' ? 'icon' : 'default'}
        onClick={() => setOpen(true)}
        className={cn(
          'cursor-pointer transition-all duration-300',
          'rounded-none',
          triggerVariant === 'pill' &&
            'border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 pr-4 pl-3',
          triggerVariant === 'icon' &&
            'border-border/40 hover:border-primary/30 hover:bg-primary/5',
          triggerVariant === 'ghost' && 'hover:bg-primary/5 hover:text-primary',
        )}
        data-test="conversation-history-button"
      >
        <div className="relative flex items-center justify-center">
          <Clock
            className={cn('size-4', triggerVariant !== 'icon' && 'mr-2')}
          />
          {triggerVariant === 'pill' && (
            <span className="text-xs font-bold tracking-tight">History</span>
          )}
          {props.isProcessing && (
            <span className="absolute -top-1 -right-1 block">
              <span className="bg-primary absolute inline-flex h-2 w-2 animate-ping rounded-full opacity-75"></span>
              <span className="bg-primary relative inline-flex h-2 w-2 rounded-full"></span>
            </span>
          )}
        </div>
      </Button>
    </div>
  );

  const content = (
    <ConversationList
      {...props}
      showHeader={true}
      isSheet={displayMode === 'sheet'}
      onConversationSelect={(id) => {
        props.onConversationSelect?.(id);
        setOpen(false);
      }}
      onNewConversation={() => {
        props.onNewConversation?.();
        setOpen(false);
      }}
      className="border-none shadow-none"
    />
  );

  if (displayMode === 'sheet') {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side={side}
          className="border-l-border/40 flex w-full flex-col overflow-hidden p-0 sm:max-w-md"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Conversation History</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      {trigger}
      <CommandDialog open={open} onOpenChange={setOpen}>
        {content}
      </CommandDialog>
    </>
  );
}
