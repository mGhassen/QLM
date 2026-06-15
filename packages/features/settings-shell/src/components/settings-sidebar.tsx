import { Button } from '@guepard/ui/button';
import { cn } from '@guepard/ui/utils';

import type {
  SettingsSection,
  SettingsSectionKey,
} from '../types/settings-section';

export type SettingsSidebarProps = {
  sections: ReadonlyArray<SettingsSection>;
  activeKey: SettingsSectionKey;
  onSelect: (key: SettingsSectionKey) => void;
};

/**
 * Vertical left-rail nav for the settings dialog. Fully controlled — the
 * parent owns `activeKey` and emits the new key via `onSelect`.
 */
export function SettingsSidebar({
  sections,
  activeKey,
  onSelect,
}: Readonly<SettingsSidebarProps>) {
  return (
    <nav aria-label="Settings sections">
      <ul className="flex flex-col gap-0.5">
        {sections.map((section) => {
          const isActive = section.key === activeKey;
          return (
            <li key={section.key}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSelect(section.key)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'w-full justify-start gap-2 px-2 text-sm',
                  isActive && 'bg-accent text-accent-foreground',
                )}
              >
                {section.icon && (
                  <span className="flex h-4 w-4 items-center justify-center">
                    {section.icon}
                  </span>
                )}
                <span className="truncate">{section.label}</span>
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
