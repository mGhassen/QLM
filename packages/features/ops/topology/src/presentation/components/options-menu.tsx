import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Grid2X2,
    LayoutGrid,
    Settings2,
    Check,
    type LucideIcon,
} from 'lucide-react';

import { cn } from '@guepard/ui/utils';
import { Button } from '@guepard/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@guepard/ui/dropdown-menu';
import type { TopologyView } from './topology-page';

export type TopologyOptionsMenuProps = {
    view: TopologyView;
    onViewChange: (view: TopologyView) => void;
    label?: string;
    iconOnly?: boolean;
};

export function TopologyOptionsMenu({
    view,
    onViewChange,
    label = 'Visualization',
    iconOnly,
}: Readonly<TopologyOptionsMenuProps>) {
    const { t } = useTranslation('topology');
    const [open, setOpen] = useState(false);

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        'text-muted-foreground hover:text-foreground h-10 gap-1.5',
                        iconOnly ? 'px-2.5' : 'px-3',
                    )}
                    aria-label={label}
                >
                    <Settings2 className="h-4 w-4 shrink-0" />
                    {!iconOnly && <span className="text-[13px] font-bold tracking-tight">{label}</span>}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-64 rounded-none border border-border p-1 shadow-xl bg-popover">
                <div className="px-2 pt-2 pb-1 text-muted-foreground/60 text-[10px] font-bold tracking-tight uppercase">
                    {t('list.viewMode')}
                </div>
                <div className="flex flex-col gap-0.5 mb-1">
                    <ViewModeItem
                        icon={LayoutGrid}
                        label={t('list.viewPools')}
                        active={view === 'pools'}
                        onClick={() => {
                            onViewChange('pools');
                            setOpen(false);
                        }}
                    />
                    <ViewModeItem
                        icon={Grid2X2}
                        label={t('list.viewHosts')}
                        active={view === 'hosts'}
                        onClick={() => {
                            onViewChange('hosts');
                            setOpen(false);
                        }}
                    />
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function ViewModeItem({
    icon: Icon,
    label,
    active,
    onClick,
}: {
    icon: LucideIcon;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex w-full items-center gap-2 rounded-none px-3 h-9 text-[11px] font-bold tracking-tight transition-all cursor-pointer outline-none border-l-2 border-transparent',
                active
                    ? 'bg-foreground/5 border-primary text-foreground'
                    : 'hover:bg-muted/50 focus:bg-muted/50 text-muted-foreground hover:text-foreground',
            )}
        >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {active && <Check className="h-4 w-4" />}
        </button>
    );
}
