import * as React from 'react';

import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { TestResult } from '@guepard/domain/usecases';
import { Button } from '@guepard/ui/button';
import { Input } from '@guepard/ui/input';
import { Label } from '@guepard/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@guepard/ui/select';
import { Textarea } from '@guepard/ui/textarea';

import { TestResultBanner } from './test-result-banner';

export type GcpFormValues = {
  name: string;
  serviceAccountJson: string;
  defaultRegion: string;
};

export type GcpCredentialsFormProps = Readonly<{
  initialValues?: Partial<GcpFormValues>;
  availableRegions?: string[];
  isTesting?: boolean;
  testResult?: TestResult | null;
  submitLabel?: string;
  onTest: (values: GcpFormValues) => void;
  onSubmit: (values: GcpFormValues) => void;
}>;

const DEFAULT_REGIONS = [
  'us-central1',
  'us-east1',
  'us-east4',
  'us-west1',
  'europe-west1',
  'europe-west2',
  'europe-west3',
  'asia-east1',
  'asia-northeast1',
  'asia-southeast1',
];

const EMPTY_VALUES: GcpFormValues = {
  name: '',
  serviceAccountJson: '',
  defaultRegion: '',
};

type Errors = Partial<Record<keyof GcpFormValues, string>>;

type ParsedServiceAccount = {
  type?: string;
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function parseServiceAccount(raw: string): ParsedServiceAccount | null {
  try {
    const parsed = JSON.parse(raw) as ParsedServiceAccount;
    if (
      parsed.type !== 'service_account' ||
      !parsed.project_id ||
      !parsed.client_email ||
      !parsed.private_key
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function validate(values: GcpFormValues, t: (key: string) => string): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) {
    errors.name = t('form.validation.nameRequired');
  } else if (values.name.length > 60) {
    errors.name = t('form.validation.nameTooLong');
  }
  if (!values.serviceAccountJson.trim()) {
    errors.serviceAccountJson = t('form.validation.serviceAccountJsonRequired');
  } else if (parseServiceAccount(values.serviceAccountJson) === null) {
    errors.serviceAccountJson = t('form.validation.serviceAccountJsonInvalid');
  }
  if (!values.defaultRegion.trim()) {
    errors.defaultRegion = t('form.validation.defaultRegionRequired');
  }
  return errors;
}

export function GcpCredentialsForm(
  props: GcpCredentialsFormProps,
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

  const [values, setValues] = React.useState<GcpFormValues>({
    ...EMPTY_VALUES,
    ...initialValues,
  });
  const [touched, setTouched] = React.useState<
    Partial<Record<keyof GcpFormValues, boolean>>
  >({});
  const [hasSubmitted, setHasSubmitted] = React.useState(false);

  const errors = validate(values, t);
  const parsed = parseServiceAccount(values.serviceAccountJson);
  const showError = (field: keyof GcpFormValues) =>
    (touched[field] || hasSubmitted) && errors[field];

  const update = <K extends keyof GcpFormValues>(
    field: K,
    value: GcpFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const markTouched = (field: keyof GcpFormValues) =>
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
        id="gcp-name"
        label={t('form.nameLabel')}
        error={showError('name') ? errors.name : undefined}
      >
        <Input
          id="gcp-name"
          data-test="gcp-name"
          placeholder={t('form.namePlaceholder')}
          value={values.name}
          onChange={(event) => update('name', event.target.value)}
          onBlur={() => markTouched('name')}
          autoComplete="off"
        />
      </FormField>

      <FormField
        id="gcp-service-account"
        label={t('form.gcp.serviceAccountJsonLabel')}
        error={
          showError('serviceAccountJson')
            ? errors.serviceAccountJson
            : undefined
        }
      >
        <Textarea
          id="gcp-service-account"
          data-test="gcp-service-account"
          rows={12}
          className="font-mono text-xs"
          placeholder={t('form.gcp.serviceAccountJsonPlaceholder')}
          value={values.serviceAccountJson}
          onChange={(event) => update('serviceAccountJson', event.target.value)}
          onBlur={() => markTouched('serviceAccountJson')}
          spellCheck={false}
        />
      </FormField>

      <FormField id="gcp-project-id" label={t('form.gcp.projectIdReadonly')}>
        <Input
          id="gcp-project-id"
          data-test="gcp-project-id"
          value={parsed?.project_id ?? ''}
          readOnly
          tabIndex={-1}
          className="bg-muted/40 cursor-not-allowed"
        />
      </FormField>

      <FormField
        id="gcp-default-region"
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
          <SelectTrigger id="gcp-default-region" data-test="gcp-default-region">
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
          data-test="gcp-test-button"
        >
          {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isTesting ? t('form.testingCta') : t('form.testCta')}
        </Button>
        <Button type="submit" disabled={isTesting} data-test="gcp-save-button">
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
