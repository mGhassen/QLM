import { useTranslation } from 'react-i18next';

import type { TestResult } from '@qlm/domain/usecases';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@qlm/ui/dialog';

import { AwsCredentialsForm, type AwsFormValues } from './aws-credentials-form';
import { GcpCredentialsForm, type GcpFormValues } from './gcp-credentials-form';

export type RotateCredentialsDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: 'aws' | 'gcp';
  isTesting?: boolean;
  testResult?: TestResult | null;
  /** Called when the user submits new AWS credentials. */
  onSubmitAws: (values: AwsFormValues) => void;
  /** Called when the user submits new GCP credentials. */
  onSubmitGcp: (values: GcpFormValues) => void;
  /** Called when the user clicks "Test connection" in either form. */
  onTestAws: (values: AwsFormValues) => void;
  onTestGcp: (values: GcpFormValues) => void;
}>;

export function RotateCredentialsDialog(
  props: RotateCredentialsDialogProps,
): React.ReactElement {
  const { t } = useTranslation('integrations');
  const {
    open,
    onOpenChange,
    provider,
    isTesting,
    testResult,
    onSubmitAws,
    onSubmitGcp,
    onTestAws,
    onTestGcp,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('rotate.title')}</DialogTitle>
          <DialogDescription>{t('rotate.body')}</DialogDescription>
        </DialogHeader>
        {provider === 'aws' ? (
          <AwsCredentialsForm
            initialValues={{}}
            isTesting={isTesting}
            testResult={testResult}
            submitLabel={t('rotate.title')}
            onTest={onTestAws}
            onSubmit={onSubmitAws}
          />
        ) : (
          <GcpCredentialsForm
            initialValues={{}}
            isTesting={isTesting}
            testResult={testResult}
            submitLabel={t('rotate.title')}
            onTest={onTestGcp}
            onSubmit={onSubmitGcp}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
