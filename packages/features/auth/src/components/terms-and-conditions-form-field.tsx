import { Checkbox } from '@guepard/ui/checkbox';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@guepard/ui/form';
import { Trans } from '@guepard/ui/trans';

export function TermsAndConditionsFormField(
  props: {
    name?: string;
  } = {},
) {
  return (
    <FormField
      name={props.name ?? 'termsAccepted'}
      render={({ field }) => {
        return (
          <FormItem>
            <FormControl>
              <label className={'flex items-start space-x-2 py-2'}>
                <Checkbox required name={field.name} />

                <div className={'text-xs'}>
                  <Trans
                    i18nKey={'auth:acceptTermsAndConditions'}
                    components={{
                      TermsOfServiceLink: (
                        <a
                          href="/terms-of-service"
                          target="_blank"
                          rel="noreferrer"
                          className={'underline'}
                        >
                          <Trans i18nKey={'auth:termsOfService'} />
                        </a>
                      ),
                      PrivacyPolicyLink: (
                        <a
                          href="/privacy-policy"
                          target="_blank"
                          rel="noreferrer"
                          className={'underline'}
                        >
                          <Trans i18nKey={'auth:privacyPolicy'} />
                        </a>
                      ),
                    }}
                  />
                </div>
              </label>
            </FormControl>

            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
