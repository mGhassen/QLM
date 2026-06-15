import { Loader2, MoreHorizontal, Pencil, Trash2, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { IntegrationConnectionOutput } from '@qlm/domain/usecases';
import { Button } from '@qlm/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@qlm/ui/dropdown-menu';

import { ProviderLogo } from './provider-logo';

export type IntegrationDetailHeaderProps = Readonly<{
  integration: IntegrationConnectionOutput;
  canManage: boolean;
  isTesting?: boolean;
  onTest: () => void;
  onRotate: () => void;
  onRename: () => void;
  onDelete: () => void;
}>;

export function IntegrationDetailHeader(
  props: IntegrationDetailHeaderProps,
): React.ReactElement {
  const { t } = useTranslation('integrations');
  const {
    integration,
    canManage,
    isTesting = false,
    onTest,
    onRotate,
    onRename,
    onDelete,
  } = props;
  const disabledTitle = canManage ? undefined : t('perm.denied');

  return (
    <div className="border-border flex items-center justify-between border-b px-6 py-4">
      <div className="flex items-center gap-4">
        <ProviderLogo provider={integration.provider} />
        <h1 className="text-foreground text-2xl font-semibold">
          {integration.name}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onTest}
          disabled={!canManage || isTesting}
          title={disabledTitle}
          data-test="integration-detail-test"
        >
          {isTesting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Zap className="mr-2 h-4 w-4" aria-hidden />
          )}
          {isTesting ? t('detail.testingCta') : t('detail.testCta')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRotate}
          disabled={!canManage}
          title={disabledTitle}
          data-test="integration-detail-rotate"
        >
          {t('detail.rotateCta')}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={t('detail.renameCta')}
              data-test="integration-detail-menu-trigger"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={onRename}
              disabled={!canManage}
              title={disabledTitle}
            >
              <Pencil className="mr-2 h-4 w-4" aria-hidden />
              {t('detail.renameCta')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onDelete}
              disabled={!canManage}
              title={disabledTitle}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden />
              {t('detail.deleteCta')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
