import * as React from 'react';

import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { TestResult } from '@qlm/domain/usecases';
import { Button } from '@qlm/ui/button';
import { Input } from '@qlm/ui/input';
import { Label } from '@qlm/ui/label';
import { SecretInput } from '@qlm/ui/secret-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@qlm/ui/select';

import { TestResultBanner } from './test-result-banner';

export type AwsFormValues = {
  name: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  defaultRegion: string;
};

export type AwsCredentialsFormProps = Readonly<{
  initialValues?: Partial<AwsFormValues>;
  /** Region ids the user can pick from. Supplied as a prop so stories can inject a small set. */
  availableRegions?: string[];
  isTesting?: boolean;
  testResult?: TestResult | null;
  submitLabel?: string;
  onTest: (values: AwsFormValues) => void;
  onSubmit: (values: AwsFormValues) => void;
}>;

const DEFAULT_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
];

const AWS_KEY_RE = /^(AKIA|ASIA)[0-9A-Z]{16}$/;

const EMPTY_VALUES: AwsFormValues = {
  name: '',
  accessKeyId: '',
  secretAccessKey: '',
  sessionToken: '',
  defaultRegion: '',
};

type Errors = Partial<Record<keyof AwsFormValues, string>>;

function validate(values: AwsFormValues, t: (key: string) => string): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) {
    errors.name = t('form.validation.nameRequired');
  } else if (values.name.length > 60) {
    errors.name = t('form.validation.nameTooLong');
  }
  if (!values.accessKeyId.trim()) {
    errors.accessKeyId = t('form.validation.accessKeyIdRequired');
  } else if (!AWS_KEY_RE.test(values.accessKeyId)) {
    errors.accessKeyId = t('form.validation.accessKeyIdInvalid');
  }
  if (!values.secretAccessKey.trim()) {
    errors.secretAccessKey = t('form.validation.secretAccessKeyRequired');
  }
  if (!values.defaultRegion.trim()) {
    errors.defaultRegion = t('form.validation.defaultRegionRequired');
  }
  return errors;
}

export function AwsCredentialsForm(
  props: AwsCredentialsFormProps,
): React.ReactElement {
  const { t } = useTranslation('integrations');
  const {
    initialValues,
    availableRegions = DEFAULT_REGIONS,
    isTesting = false,
    testResult = null,
    submitLabel,
    onTest,
    onSubmit,
  } = props;

  const [values, setValues] = React.useState<AwsFormValues>({
    ...EMPTY_VALUES,
    ...initialValues,
  });
  const [touched, setTouched] = React.useState<
    Partial<Record<keyof AwsFormValues, boolean>>
  >({});
  const [hasSubmitted, setHasSubmitted] = React.useState(false);

  const errors = validate(values, t);
  const showError = (field: keyof AwsFormValues) =>
    (touched[field] || hasSubmitted) && errors[field];

  const update = <K extends keyof AwsFormValues>(
    field: K,
    value: AwsFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const markTouched = (field: keyof AwsFormValues) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const handleTest = () => {
    setHasSubmitted(true);
    if (Object.keys(errors).length === 0) {
      onTest(values);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    if (Object.keys(errors).length === 0) {
      onSubmit(values);
    }
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
      <FormField
        id="aws-name"
        label={t('form.nameLabel')}
        error={showError('name') ? errors.name : undefined}
      >
        <Input
          id="aws-name"
          data-test="aws-name"
          placeholder={t('form.namePlaceholder')}
          value={values.name}
          onChange={(event) => update('name', event.target.value)}
          onBlur={() => markTouched('name')}
          autoComplete="off"
        />
      </FormField>

      <FormField
        id="aws-access-key-id"
        label={t('form.aws.accessKeyIdLabel')}
        error={showError('accessKeyId') ? errors.accessKeyId : undefined}
      >
        <Input
          id="aws-access-key-id"
          data-test="aws-access-key-id"
          placeholder={t('form.aws.accessKeyIdPlaceholder')}
          value={values.accessKeyId}
          onChange={(event) => update('accessKeyId', event.target.value)}
          onBlur={() => markTouched('accessKeyId')}
          autoComplete="off"
          spellCheck={false}
        />
      </FormField>

      <FormField
        id="aws-secret-access-key"
        label={t('form.aws.secretAccessKeyLabel')}
        error={
          showError('secretAccessKey') ? errors.secretAccessKey : undefined
        }
      >
        <SecretInput
          id="aws-secret-access-key"
          data-test="aws-secret-access-key"
          value={values.secretAccessKey}
          onChange={(event) => update('secretAccessKey', event.target.value)}
          onBlur={() => markTouched('secretAccessKey')}
          autoComplete="off"
          spellCheck={false}
        />
      </FormField>

      <FormField id="aws-session-token" label={t('form.aws.sessionTokenLabel')}>
        <SecretInput
          id="aws-session-token"
          data-test="aws-session-token"
          value={values.sessionToken}
          onChange={(event) => update('sessionToken', event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </FormField>

      <FormField
        id="aws-default-region"
        label={t('form.defaultRegionLabel')}
        error={showError('defaultRegion') ? errors.defaultRegion : undefined}
      >
        <Select
          value={values.defaultRegion || undefined}
          onValueChange={(value) => {
            update('defaultRegion', value);
            markTouched('defaultRegion');
          }}
        >
          <SelectTrigger id="aws-default-region" data-test="aws-default-region">
            <SelectValue placeholder={t('form.defaultRegionPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {availableRegions.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {testResult && <TestResultBanner result={testResult} />}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleTest}
          disabled={isTesting}
          data-test="aws-test-button"
        >
          {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isTesting ? t('form.testingCta') : t('form.testCta')}
        </Button>
        <Button type="submit" disabled={isTesting} data-test="aws-save-button">
          {submitLabel ?? t('form.saveCta')}
        </Button>
      </div>
    </form>
  );
}

type FormFieldProps = Readonly<{
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}>;

function FormField(props: FormFieldProps): React.ReactElement {
  const { id, label, error, children } = props;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
