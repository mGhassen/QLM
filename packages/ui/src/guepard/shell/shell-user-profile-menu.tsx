import {
  Computer,
  HelpCircle,
  Home,
  LogOut,
  Moon,
  Settings,
  Sun,
  Zap,
} from 'lucide-react';
import { useTheme } from 'next-themes';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';
import { Button } from '../../shadcn/button';
import { cn } from '../../lib/utils';
import { ProfileAvatar } from '../profile-avatar';
import { useShellSidebar } from './project-shell-frame';

export type ShellUserProfileMenuProps = {
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  /**
   * Gear icon in the dropdown header. Historically unused; renamed from
   * `onSettingsClick` by RFC 0009 AM-1 to free the name for the Settings
   * nav-item button.
   */
  onProfileSettingsIconClick?: () => void;
  onHomePageClick?: () => void;
  /**
   * Opens the Settings dialog (RFC 0009 AM-1). Replaces the previous
   * `onAccessTokensClick`.
   */
  onSettingsClick?: () => void;
  onHelpClick?: () => void;
  onLogOutClick: () => void;
  onUpgradeClick?: () => void;
  platformStatus?: { ok: boolean; message: string };
  /** Compact avatar-only trigger for the tab bar. */
  variant?: 'sidebar' | 'tabbar';
};

export function ShellUserProfileMenu({
  displayName,
  email,
  avatarUrl,
  onProfileSettingsIconClick,
  onHomePageClick,
  onSettingsClick,
  onHelpClick,
  onLogOutClick,
  onUpgradeClick,
  platformStatus,
  variant = 'sidebar',
}: Readonly<ShellUserProfileMenuProps>) {
  const { theme, setTheme } = useTheme();
  const { collapsed } = useShellSidebar();
  const compact = variant === 'tabbar' || collapsed;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-test="shell-user-menu-trigger"
          className={cn(
            'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent flex items-center justify-center gap-2 rounded-md text-left transition-colors',
            variant === 'tabbar'
              ? 'hover:bg-muted h-8 w-8 rounded-sm p-0'
              : 'w-full px-2 py-1.5',
          )}
        >
          <ProfileAvatar
            displayName={displayName}
            pictureUrl={avatarUrl}
            className="h-6 w-6 text-[10px]"
          />
          {!compact && (
            <span className="min-w-0 flex-1 truncate text-xs font-medium">
              {displayName}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={variant === 'tabbar' ? 'bottom' : collapsed ? 'right' : 'top'}
        align={variant === 'tabbar' ? 'end' : 'start'}
        className="min-w-56"
        sideOffset={4}
      >
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="text-muted-foreground truncate text-xs">{email}</p>
          </div>
          {onProfileSettingsIconClick && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-2 h-7 w-7 shrink-0"
              onClick={onProfileSettingsIconClick}
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          )}
        </div>

        <DropdownMenuSeparator />

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm">Theme</span>
          <div className="flex items-center gap-0.5 rounded-md border p-0.5">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded transition-colors',
                  theme === t
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                title={t.charAt(0).toUpperCase() + t.slice(1)}
              >
                {t === 'light' && <Sun className="h-3.5 w-3.5" />}
                {t === 'dark' && <Moon className="h-3.5 w-3.5" />}
                {t === 'system' && <Computer className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </div>

        <DropdownMenuSeparator />

        <div className="py-1">
          {onHomePageClick && (
            <DropdownMenuItem
              onSelect={onHomePageClick}
              className="hover:bg-accent flex w-full items-center justify-between px-3 py-2 text-sm"
            >
              <span>Home Page</span>
              <Home className="text-muted-foreground h-4 w-4" />
            </DropdownMenuItem>
          )}
          {onSettingsClick && (
            <DropdownMenuItem
              data-test="shell-account-dropdown-settings"
              onSelect={onSettingsClick}
              className="hover:bg-accent flex w-full items-center justify-between px-3 py-2 text-sm"
            >
              <span>Settings</span>
              <Settings className="text-muted-foreground h-4 w-4" />
            </DropdownMenuItem>
          )}
          {onHelpClick && (
            <DropdownMenuItem
              onSelect={onHelpClick}
              className="hover:bg-accent flex w-full items-center justify-between px-3 py-2 text-sm"
            >
              <span>Help</span>
              <HelpCircle className="text-muted-foreground h-4 w-4" />
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={onLogOutClick}
            className="hover:bg-accent flex w-full items-center justify-between px-3 py-2 text-sm"
          >
            <span>Log Out</span>
            <LogOut className="text-muted-foreground h-4 w-4" />
          </DropdownMenuItem>
        </div>

        {onUpgradeClick && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={onUpgradeClick}
              >
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                Upgrade to Pro
              </Button>
            </div>
          </>
        )}

        {platformStatus && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2">
              <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
                Platform Status
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    platformStatus.ok ? 'bg-green-500' : 'bg-red-500',
                  )}
                />
                <span className="text-muted-foreground text-xs">
                  {platformStatus.message}
                </span>
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
