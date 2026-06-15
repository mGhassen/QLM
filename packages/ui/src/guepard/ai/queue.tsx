'use client';

import { Button } from '../../shadcn/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../shadcn/collapsible';
import { ScrollArea } from '../../shadcn/scroll-area';
import { cn } from '../../lib/utils';
import { ChevronDownIcon, PaperclipIcon, CheckCircle2Icon } from 'lucide-react';
import type { ComponentProps } from 'react';

export type QueueMessagePart = {
  type: string;
  text?: string;
  url?: string;
  filename?: string;
  mediaType?: string;
};

export type QueueMessage = {
  id: string;
  parts: QueueMessagePart[];
};

export type QueueTodo = {
  id: string;
  title: string;
  description?: string;
  status?: 'pending' | 'completed';
};

export type QueueItemProps = ComponentProps<'li'>;

export const QueueItem = ({ className, ...props }: QueueItemProps) => (
  <li
    className={cn(
      'group flex flex-col gap-1 rounded-lg py-2 transition-all duration-200',
      'hover:bg-accent/30 -mx-2 px-2',
      className,
    )}
    {...props}
  />
);

export type QueueItemIndicatorProps = ComponentProps<'span'> & {
  completed?: boolean;
};

export const QueueItemIndicator = ({
  completed = false,
  className,
  ...props
}: QueueItemIndicatorProps) => (
  <span
    className={cn(
      'mt-0.5 inline-flex size-6 shrink-0 items-center justify-center self-start rounded-md p-1.5 shadow-sm transition-colors duration-200',
      completed
        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
        : 'bg-muted/50 text-muted-foreground',
      className,
    )}
    {...props}
  >
    {completed ? (
      <CheckCircle2Icon className="size-3" />
    ) : (
      <span className="bg-muted-foreground/60 block size-1.5 rounded-full" />
    )}
  </span>
);

export type QueueItemContentProps = ComponentProps<'span'> & {
  completed?: boolean;
};

export const QueueItemContent = ({
  completed = false,
  className,
  ...props
}: QueueItemContentProps) => (
  <span
    className={cn(
      'line-clamp-1 text-sm leading-tight wrap-break-word transition-all duration-200',
      completed
        ? 'text-muted-foreground line-through opacity-70'
        : 'text-foreground',
      className,
    )}
    {...props}
  />
);

export type QueueItemDescriptionProps = ComponentProps<'div'> & {
  completed?: boolean;
};

export const QueueItemDescription = ({
  completed = false,
  className,
  ...props
}: QueueItemDescriptionProps) => (
  <div
    className={cn(
      'text-muted-foreground mt-0.5 text-xs leading-relaxed opacity-80',
      completed ? 'line-through opacity-60' : undefined,
      className,
    )}
    {...props}
  />
);

export type QueueItemActionsProps = ComponentProps<'div'>;

export const QueueItemActions = ({
  className,
  ...props
}: QueueItemActionsProps) => (
  <div className={cn('flex items-center gap-1', className)} {...props} />
);

export type QueueItemActionProps = Omit<
  ComponentProps<typeof Button>,
  'variant' | 'size'
>;

export const QueueItemAction = ({
  className,
  ...props
}: QueueItemActionProps) => (
  <Button
    className={cn(
      'text-muted-foreground hover:text-foreground hover:bg-accent mt-0.5 size-auto rounded p-1 opacity-0 transition-opacity group-hover:opacity-100',
      className,
    )}
    size="icon"
    type="button"
    variant="ghost"
    {...props}
  />
);

export type QueueItemAttachmentProps = ComponentProps<'div'>;

export const QueueItemAttachment = ({
  className,
  ...props
}: QueueItemAttachmentProps) => (
  <div className={cn('mt-1 flex flex-wrap gap-2', className)} {...props} />
);

export type QueueItemImageProps = ComponentProps<'img'>;

export const QueueItemImage = ({
  className,
  ...props
}: QueueItemImageProps) => (
  <img
    alt=""
    className={cn(
      'border-border/60 bg-muted/30 h-8 w-8 rounded-md border object-cover',
      className,
    )}
    height={32}
    width={32}
    {...props}
  />
);

export type QueueItemFileProps = ComponentProps<'span'>;

export const QueueItemFile = ({
  children,
  className,
  ...props
}: QueueItemFileProps) => (
  <span
    className={cn(
      'border-border/60 bg-muted/40 text-muted-foreground flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium',
      className,
    )}
    {...props}
  >
    <PaperclipIcon size={12} />
    <span className="max-w-[100px] truncate">{children}</span>
  </span>
);

export type QueueListProps = ComponentProps<typeof ScrollArea>;

export const QueueList = ({
  children,
  className,
  ...props
}: QueueListProps) => (
  <ScrollArea className={cn('mt-2 -mb-1', className)} {...props}>
    <div className="max-h-40 pr-4">
      <ul className="flex flex-col gap-1">{children}</ul>
    </div>
  </ScrollArea>
);

export type QueueSectionProps = ComponentProps<typeof Collapsible>;

export const QueueSection = ({
  className,
  defaultOpen = true,
  ...props
}: QueueSectionProps) => (
  <Collapsible className={cn(className)} defaultOpen={defaultOpen} {...props} />
);

export type QueueSectionTriggerProps = ComponentProps<'button'>;

export const QueueSectionTrigger = ({
  children,
  className,
  ...props
}: QueueSectionTriggerProps) => (
  <CollapsibleTrigger asChild>
    <button
      className={cn(
        'group bg-muted/30 text-muted-foreground hover:bg-accent/30 flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium transition-colors',
        className,
      )}
      type="button"
      {...props}
    >
      {children}
    </button>
  </CollapsibleTrigger>
);

export type QueueSectionLabelProps = ComponentProps<'span'> & {
  count?: number;
  label: string;
  icon?: React.ReactNode;
};

export const QueueSectionLabel = ({
  count,
  label,
  icon,
  className,
  ...props
}: QueueSectionLabelProps) => (
  <span className={cn('flex w-full items-center gap-2', className)} {...props}>
    <span className="inline-flex size-4 shrink-0 items-center justify-center">
      <ChevronDownIcon className="size-4 transition-transform group-data-[state=closed]:-rotate-90" />
    </span>
    {icon}
    <span className="min-w-0 flex-1 truncate text-[11px] font-bold tracking-tight">
      {count} {label}
    </span>
  </span>
);

export type QueueSectionContentProps = ComponentProps<
  typeof CollapsibleContent
>;

export const QueueSectionContent = ({
  className,
  ...props
}: QueueSectionContentProps) => (
  <CollapsibleContent className={cn(className)} {...props} />
);

export type QueueProps = ComponentProps<'div'>;

export const Queue = ({ className, ...props }: QueueProps) => (
  <div
    className={cn(
      'border-border bg-background flex flex-col gap-2 rounded-xl border px-3 pt-2 pb-2 shadow-xs',
      className,
    )}
    {...props}
  />
);
