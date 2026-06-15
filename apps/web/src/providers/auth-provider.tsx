'use client';

import { useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { useTelemetry } from '@qlm/telemetry';
import { useAppEvents } from '@qlm/shared/events';
import { useAuthChangeListener } from '@qlm/supabase/hooks/use-auth-change-listener';
import { USER_QUERY_KEY } from '@qlm/supabase/hooks/use-user';

export function AuthProvider(props: React.PropsWithChildren) {
  const queryClient = useQueryClient();
  const dispatchEvent = useDispatchAppEventFromAuthEvent();

  useAuthChangeListener({
    onEvent: (event, session) => {
      dispatchEvent(event, session?.user.id, {
        email: session?.user.email ?? '',
      });

      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        queryClient
          .invalidateQueries({ queryKey: USER_QUERY_KEY })
          .catch(() => {
            // ignore: cache sync is best-effort
          });
        queryClient
          .invalidateQueries({ queryKey: ['supabase:access-token'] })
          .catch(() => {
            // ignore: cache sync is best-effort
          });
      }

      if (event === 'SIGNED_OUT') {
        queryClient.setQueryData(USER_QUERY_KEY, null);
        queryClient.setQueryData(['supabase:access-token'], null);
      }
    },
  });

  return props.children;
}

function useDispatchAppEventFromAuthEvent() {
  const { emit } = useAppEvents();
  const telemetry = useTelemetry();

  return useCallback(
    (
      type: string,
      userId: string | undefined,
      traits: Record<string, string> = {},
    ) => {
      switch (type) {
        case 'SIGNED_IN':
          if (userId) {
            emit({
              type: 'user.signedIn',
              payload: { userId, ...traits },
            });

            telemetry.identify(userId, traits);
          }

          break;

        case 'USER_UPDATED':
          emit({
            type: 'user.updated',
            payload: { userId: userId!, ...traits },
          });

          break;
      }
    },
    [emit, telemetry],
  );
}
