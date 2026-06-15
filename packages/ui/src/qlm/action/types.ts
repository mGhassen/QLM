import type { LucideIcon } from 'lucide-react';

export type ActionIntent = 'primary' | 'secondary' | 'destructive';

export type ActionConfirm<T> = Readonly<{
  title: string;
  description: string | ((ctx: T | T[]) => string);
  confirmLabel: string;
  cancelLabel: string;
  requireTyped?: {
    value: (ctx: T | T[]) => string;
    prompt: string;
  };
}>;

export type Action<T> = Readonly<{
  id: string;
  label: string;
  icon?: LucideIcon;
  intent?: ActionIntent;
  isVisible?: (ctx: T | T[]) => boolean;
  isDisabled?: (ctx: T | T[]) => boolean;
  confirm?: ActionConfirm<T>;
  run: (ctx: T | T[]) => void | Promise<void>;
}>;
