import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { DatabaseZap, Globe, Key, Network, ShieldCheck, Tag } from 'lucide-react';

import type { Database } from '@guepard/domain/entities';
import { DataRow, EntitySection } from '@guepard/ui/entity-primitives';

export type DetailProfileSectionProps = Readonly<{ database: Database }>;

function DetailProfileSectionInner({ database }: DetailProfileSectionProps) {
  const { t } = useTranslation('databases');
  const role = database.dbRole;

  return (
    <EntitySection title={t('detail.profile.title')} className="">
      <div className="flex flex-col divide-y divide-border/50">
        <DataRow
          icon={<Tag className="h-3 w-3" />}
          label={t('detail.profile.provider')}
          value={database.provider}
        />
        <DataRow
          icon={<DatabaseZap className="h-3 w-3" />}
          label={t('detail.profile.version')}
          value={database.version}
          mono
        />
        <DataRow
          icon={<Globe className="h-3 w-3" />}
          label={t('detail.profile.fqdn')}
          value={database.fqdn}
          mono
        />
        <DataRow
          icon={<Network className="h-3 w-3" />}
          label={t('detail.profile.port')}
          value={database.port}
          mono
        />
        {role && (
          <>
            <DataRow
              icon={<Key className="h-3 w-3" />}
              label={t('detail.profile.username')}
              value={role.username}
              mono
            />
            <DataRow
              icon={<ShieldCheck className="h-3 w-3" />}
              label={t('detail.profile.superuser')}
              value={role.superuser ? 'Yes' : 'No'}
            />
            <DataRow
              icon={<ShieldCheck className="h-3 w-3" />}
              label={t('detail.profile.privileges')}
              value={
                (role.privileges?.length ?? 0) > 0
                  ? (role.privileges ?? []).map(String).join(', ')
                  : '—'
              }
            />
          </>
        )}
      </div>
    </EntitySection>
  );
}

export const DetailProfileSection = memo(DetailProfileSectionInner);
