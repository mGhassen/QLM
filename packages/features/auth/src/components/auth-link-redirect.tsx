'use client';

import { useEffect } from 'react';

import { useNavigate, useRouterState } from '@tanstack/react-router';

import { useSupabase } from '@guepard/supabase/hooks/use-supabase';

function AuthLinkRedirect(props: { redirectPath?: string }) {
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const params = new URLSearchParams(searchStr);

  const redirectPath = params.get('redirectPath') ?? props.redirectPath ?? '/';

  useRedirectOnSignIn(redirectPath);

  return null;
}

export default AuthLinkRedirect;

function useRedirectOnSignIn(redirectPath: string) {
  const supabase = useSupabase();
  const navigate = useNavigate();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) {
        return navigate({ to: redirectPath });
      }
    });

    return () => data.subscription.unsubscribe();
  }, [supabase, navigate, redirectPath]);
}
