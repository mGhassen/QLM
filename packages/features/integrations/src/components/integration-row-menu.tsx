import { MoreHorizontal, Pencil, RotateCw, Trash2, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@guepard/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@guepard/ui/dropdown-menu';

export type IntegrationRowMenuProps = Readonly<{
  canManage: boolean;
  onTest: () => void;
  onRename: () => void;
  onRotate: () => void;
  onDelete: () => void;
}>;

export function IntegrationRowMenu(
  props: IntegrationRowMenuProps,
): React.ReactElement {
  const { t } = useTranslation('integrations');
  const { canManage, onTest, onRename, onRotate, onDelete } = props;
  const disabledTitle = canManage ? undefined : t('perm.denied');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={t('detail.testCta')}
          data-test="integration-row-menu-trigger"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={onTest}
          disabled={!canManage}
          title={disabledTitle}
        >
          <Zap className="mr-2 h-4 w-4" aria-hidden />
          {t('detail.testCta')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={onRename}
          disabled={!canManage}
          title={disabledTitle}
        >
          <Pencil className="mr-2 h-4 w-4" aria-hidden />
          {t('detail.renameCta')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={onRotate}
          disabled={!canManage}
          title={disabledTitle}
        >
          <RotateCw className="mr-2 h-4 w-4" aria-hidden />
          {t('detail.rotateCta')}
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
  );
}
