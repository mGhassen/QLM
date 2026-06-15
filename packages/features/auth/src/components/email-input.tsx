'use client';

import { useEffect, useState } from 'react';

import i18next from 'i18next';
import { Mail } from 'lucide-react';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@qlm/ui/input-group';

const DEFAULT_PLACEHOLDER = 'your@email.com';

function getEmailPlaceholder() {
  if (!i18next.isInitialized) {
    return DEFAULT_PLACEHOLDER;
  }

  const translation = i18next.t('emailPlaceholder', { ns: 'auth' });

  return translation && translation !== 'emailPlaceholder'
    ? translation
    : DEFAULT_PLACEHOLDER;
}

export function EmailInput(props: React.ComponentProps<'input'>) {
  const [placeholder, setPlaceholder] = useState(DEFAULT_PLACEHOLDER);

  useEffect(() => {
    const update = () => setPlaceholder(getEmailPlaceholder());

    update();
    i18next.on('initialized', update);
    i18next.on('loaded', update);
    i18next.on('languageChanged', update);

    return () => {
      i18next.off('initialized', update);
      i18next.off('loaded', update);
      i18next.off('languageChanged', update);
    };
  }, []);

  return (
    <InputGroup className="dark:bg-background">
      <InputGroupAddon>
        <Mail className="h-4 w-4" />
      </InputGroupAddon>

      <InputGroupInput
        data-test={'email-input'}
        required
        type="email"
        placeholder={placeholder}
        {...props}
      />
    </InputGroup>
  );
}
