import { ChevronDown } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { useShellSidebar } from '@qlm/ui/shell';

export interface TopbarTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  orgInitial: string;
  orgColor: string;
  projectName: string;
  isOpen: boolean;
  onOpen?: () => void;
}

/**
 * Clickable trigger for the topbar dropdown. Forwards `ref` + all native
 * button props so Radix's `DropdownMenuTrigger asChild` can attach its
 * own click/keyboard handlers + aria state alongside ours.
 *
 * In the collapsed sidebar the header slot is ~32px wide, so we render
 * the org avatar only — the chevron and project name would otherwise
 * overflow as truncated ASCII. The `projectName` still feeds the
 * button's accessible name so screen readers keep the context.
 */
export const TopbarTrigger = forwardRef<HTMLButtonElement, TopbarTriggerProps>(
  function TopbarTrigger(props, ref) {
    const {
      orgInitial,
      orgColor,
      projectName,
      isOpen,
      onOpen,
      onClick,
      className,
      ...rest
    } = props;
    const { collapsed } = useShellSidebar();
    return (
      <button
        ref={ref}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={collapsed ? projectName : undefined}
        title={collapsed ? projectName : undefined}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) onOpen?.();
        }}
        className={
          'hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold transition-colors' +
          (className ? ` ${className}` : '')
        }
        {...rest}
      >
        <span
          aria-hidden
          className="inline-flex size-5 items-center justify-center rounded text-xs font-bold text-white"
          style={{ backgroundColor: orgColor }}
        >
          {orgInitial}
        </span>
        {!collapsed && (
          <>
            <ChevronDown aria-hidden className="size-3" />
            <span>{projectName}</span>
          </>
        )}
      </button>
    );
  },
);
