import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  DirtyStateProvider,
  SettingsLayout,
  type SettingsSection,
  type SettingsSectionKey,
} from '@qlm/settings-shell';

import { PersonalTokensSection } from './sections/personal-tokens';
import { ProfileSection } from './sections/profile';

const PROFILE_KEY = 'profile';
const PERSONAL_TOKENS_KEY = 'personal-tokens';

export default function UserSettingsPluginRoot() {
  const { t } = useTranslation('settings');

  const sections = useMemo<ReadonlyArray<SettingsSection>>(
    () => [
      {
        key: PROFILE_KEY,
        label: t('nav.profile'),
        content: <ProfileSection />,
      },
      {
        key: PERSONAL_TOKENS_KEY,
        label: t('nav.personalTokens'),
        content: <PersonalTokensSection />,
      },
    ],
    [t],
  );

  const validKeys = useMemo(
    () => new Set(sections.map((s) => s.key)),
    [sections],
  );

  const readSectionFromUrl = (): SettingsSectionKey => {
    if (typeof window === 'undefined') return PROFILE_KEY;
    const param = new URLSearchParams(window.location.search).get('section');
    return param && validKeys.has(param) ? param : PROFILE_KEY;
  };

  const writeSectionToUrl = (section: SettingsSectionKey) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('section') === section) return;
    url.searchParams.set('section', section);
    window.history.replaceState(window.history.state, '', url.toString());
  };

  const [storedKey, setStoredKey] =
    useState<SettingsSectionKey>(readSectionFromUrl);

  const activeKey = validKeys.has(storedKey) ? storedKey : PROFILE_KEY;

  useEffect(() => {
    writeSectionToUrl(activeKey);
  }, [activeKey]);

  const active = sections.find((s) => s.key === activeKey) ?? sections[0]!;

  const handleSelect = (key: SettingsSectionKey) => {
    if (validKeys.has(key)) setStoredKey(key);
  };

  return (
    <DirtyStateProvider>
      <SettingsLayout
        sections={sections}
        activeKey={activeKey}
        onSelect={handleSelect}
      >
        {active.content}
      </SettingsLayout>
    </DirtyStateProvider>
  );
}
