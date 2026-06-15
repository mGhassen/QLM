import { useMemo } from 'react';

import { useFetcher } from 'react-router';

import { z } from 'zod';

import type { SendOtpEmailSchema } from '../send-otp.schema';

export function useRequestOtp() {
  const fetcher = useFetcher<{
    success: boolean;
  }>();

  return useMemo(() => {
    return {
      submit: (payload: z.infer<typeof SendOtpEmailSchema>) =>
        fetcher.submit(payload, {
          action: '/api/otp/send',
          method: 'POST',
          encType: 'application/json',
        }),
      data: fetcher.data,
      pending: fetcher.state === 'submitting',
    };
  }, [fetcher]);
}
