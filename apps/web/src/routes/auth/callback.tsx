import { createFileRoute } from '@tanstack/react-router';

import { createAuthCallbackService } from '@guepard/supabase/auth';
import { getSupabaseServerClient } from '@guepard/supabase/server-client';

import pathsConfig from '@/config/paths.config';

function redirectResponse(
  url: string,
  request: Request,
  cookieHeaders: Headers,
) {
  const headers = new Headers();
  headers.set('Location', new URL(url, request.url).toString());
  cookieHeaders.forEach((value, key) => {
    headers.append(key, value);
  });

  return new Response(null, {
    status: 302,
    headers,
  });
}

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { client, headers: cookieHeaders } =
          getSupabaseServerClient(request);
        const service = createAuthCallbackService(client);
        const { nextPath } = await service.exchangeCodeForSession(request, {
          joinOrganizationPath: pathsConfig.app.joinOrganization,
          redirectPath: pathsConfig.app.home,
          errorPath: pathsConfig.auth.callbackError,
        });

        return redirectResponse(nextPath, request, cookieHeaders);
      },
    },
  },
});
