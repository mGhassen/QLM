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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';
import { SidebarMenuButton } from '../../shadcn/sidebar';
import { Button } from '../../shadcn/button';
import { cn } from '../../lib/utils';
import { ProfileAvatar } from '../profile-avatar';

export type UserProfileMenuProps = {
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  /**
   * Gear icon in the dropdown header. Historically unused; kept for future
   * per-account quick-settings. Renamed from `onSettingsClick` by
   * RFC 0009 AM-1 to free that name for the new Settings nav-item button.
   */
  onProfileSettingsIconClick?: () => void;
  onHomePageClick?: () => void;
  /**
   * Opens the Settings dialog (RFC 0009 AM-1). Replaces the previous
   * `onAccessTokensClick` which linked directly to `/user/tokens`.
   */
  onSettingsClick?: () => void;
  onHelpClick?: () => void;
  onLogOutClick: () => void;
  onUpgradeClick?: () => void;
  platformStatus?: { ok: boolean; message: string };
};

export function UserProfileMenu({
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
}: Readonly<UserProfileMenuProps>) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          data-test="account-dropdown-trigger"
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <ProfileAvatar
            displayName={displayName}
            pictureUrl={avatarUrl}
            className="h-7 w-7 text-xs"
          />
          <span className="truncate font-medium">{displayName}</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        className="w-[--radix-dropdown-menu-trigger-width] min-w-64"
        sideOffset={4}
      >
        {/* Header */}
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

        {/* Theme toggle */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm">Theme</span>
          <div className="flex items-center gap-0.5 rounded-md border p-0.5">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
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

        {/* Nav items */}
        <div className="py-1">
          {onHomePageClick && (
            <button
              onClick={onHomePageClick}
              className="hover:bg-accent flex w-full items-center justify-between px-3 py-2 text-sm"
            >
              <span>Home Page</span>
              <Home className="text-muted-foreground h-4 w-4" />
            </button>
          )}
          {onSettingsClick && (
            <button
              data-test="account-dropdown-settings"
              onClick={onSettingsClick}
              className="hover:bg-accent flex w-full items-center justify-between px-3 py-2 text-sm"
            >
              <span>Settings</span>
              <Settings className="text-muted-foreground h-4 w-4" />
            </button>
          )}
          {onHelpClick && (
            <button
              onClick={onHelpClick}
              className="hover:bg-accent flex w-full items-center justify-between px-3 py-2 text-sm"
            >
              <span>Help</span>
              <HelpCircle className="text-muted-foreground h-4 w-4" />
            </button>
          )}
          <button
            data-test="account-dropdown-sign-out"
            onClick={onLogOutClick}
            className="hover:bg-accent flex w-full items-center justify-between px-3 py-2 text-sm"
          >
            <span>Log Out</span>
            <LogOut className="text-muted-foreground h-4 w-4" />
          </button>
        </div>

        {/* Upgrade CTA */}
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

        {/* Platform status */}
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
