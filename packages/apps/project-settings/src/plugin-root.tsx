import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  SettingsLayout,
  type SettingsSection,
  type SettingsSectionKey,
} from '@qlm/settings-shell';

import { ProjectSettingsGeneralSection } from './sections/general';

const SECTION_KEYS = ['general'] as const;
type ProjectSectionKey = (typeof SECTION_KEYS)[number];

function isProjectSectionKey(
  value: string | null,
): value is ProjectSectionKey {
  return value !== null && (SECTION_KEYS as readonly string[]).includes(value);
}

function readSectionFromUrl(): ProjectSectionKey {
  if (typeof window === 'undefined') return 'general';
  const param = new URLSearchParams(window.location.search).get('section');
  return isProjectSectionKey(param) ? param : 'general';
}

function writeSectionToUrl(section: ProjectSectionKey) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (url.searchParams.get('section') === section) return;
  url.searchParams.set('section', section);
  window.history.replaceState(window.history.state, '', url.toString());
}

export default function ProjectSettingsPluginRoot() {
  const { t } = useTranslation('project-settings');

  const sections: ReadonlyArray<SettingsSection> = [
    {
      key: 'general',
      label: t('sections.general.title'),
      content: <ProjectSettingsGeneralSection />,
    },
  ];

  const [activeKey, setActiveKey] = useState<ProjectSectionKey>(() =>
    readSectionFromUrl(),
  );

  useEffect(() => {
    writeSectionToUrl(activeKey);
  }, [activeKey]);

  const active = sections.find((s) => s.key === activeKey) ?? sections[0]!;

  const handleSelect = (key: SettingsSectionKey) => {
    if (isProjectSectionKey(key)) {
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
