import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  SettingsLayout,
  type SettingsSection,
  type SettingsSectionKey,
} from '@guepard/settings-shell';

import { OrgSettingsBillingSection } from './sections/billing';
import { OrgSettingsGeneralSection } from './sections/general';
import { OrgSettingsMembersSection } from './sections/members';
import { OrgSettingsUsageSection } from './sections/usage';

const SECTION_KEYS = ['general', 'members', 'billing', 'usage'] as const;
type OrgSectionKey = (typeof SECTION_KEYS)[number];

function isOrgSectionKey(value: string | null): value is OrgSectionKey {
  return value !== null && (SECTION_KEYS as readonly string[]).includes(value);
}

function readSectionFromUrl(): OrgSectionKey {
  if (typeof window === 'undefined') return 'general';
  const param = new URLSearchParams(window.location.search).get('section');
  return isOrgSectionKey(param) ? param : 'general';
}

function writeSectionToUrl(section: OrgSectionKey) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (url.searchParams.get('section') === section) return;
  url.searchParams.set('section', section);
  window.history.replaceState(window.history.state, '', url.toString());
}

export default function OrgSettingsPluginRoot() {
  const { t } = useTranslation('org-settings');

  const sections: ReadonlyArray<SettingsSection> = [
    {
      key: 'general',
      label: t('sections.general.title'),
      content: <OrgSettingsGeneralSection />,
    },
    {
      key: 'members',
      label: t('sections.members.title'),
      content: <OrgSettingsMembersSection />,
    },
    {
      key: 'billing',
      label: t('sections.billing.title'),
      content: <OrgSettingsBillingSection />,
    },
    {
      key: 'usage',
      label: t('sections.usage.title'),
      content: <OrgSettingsUsageSection />,
    },
  ];

  const [activeKey, setActiveKey] = useState<OrgSectionKey>(() =>
    readSectionFromUrl(),
  );

  useEffect(() => {
    writeSectionToUrl(activeKey);
  }, [activeKey]);

  const active =
    sections.find((s) => s.key === activeKey) ?? sections[0]!;

  const handleSelect = (key: SettingsSectionKey) => {
    if (isOrgSectionKey(key)) {
      setActiveKey(key);
    }
  };

  return (
    <SettingsLayout
      sections={sections}
      activeKey={activeKey}
      onSelect={handleSelect}
    >
      {active.content}
    </SettingsLayout>
  );
}
