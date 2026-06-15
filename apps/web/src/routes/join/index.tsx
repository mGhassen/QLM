import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, Navigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';

import { AcceptInvitationContainer } from '@qlm/accounts/components';
import { AuthLayoutShell } from '@qlm/auth/shared';
import { getSupabaseBrowserClient } from '@qlm/supabase/browser-client';
import { useUser } from '@qlm/supabase/hooks/use-user';
import { requireUser } from '@qlm/supabase/require-user';
import { getSupabaseServerAdminClient } from '@qlm/supabase/server-admin-client';
import { getSupabaseServerClient } from '@qlm/supabase/server-client';
import { Button } from '@qlm/ui/button';
import { Heading } from '@qlm/ui/heading';
import { Trans } from '@qlm/ui/trans';

import { AppLogo } from '@/components/app-logo';
import pathsConfig from '@/config/paths.config';

/**
 * `/join` — team invitation acceptance page. Ported from
 * `qwery-enterprise/apps/web/app/routes/join.tsx`, adapted to
 * TanStack Router/Start instead of React Router.
 *
 * Entry points:
 *   - Click-through from the invitation email → `/join/accept?invite_token=X`
 *     → `/auth/confirm` → `/join?invite_token=X` (authenticated)
 *   - Manual visit by an authenticated user with an `invite_token` they
 *     received out-of-band.
 *
 * The loader is client-side: the invitee is authenticated by the time
 * they reach this page, and RLS policy `invitations_read_self` lets
 * them read their own invitation row from the browser. Only the POST
 * handler needs the admin client — the `accept_invitation` RPC is
 * `service_role` only.
 */

const joinSearchSchema = z.object({
  invite_token: z.string().optional(),
  is_new_user: z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => value === true || value === 'true'),
  error: z.string().optional(),
});

// Matches `AcceptInvitationSchema` in
// `packages/features/accounts/src/schema/accept-invitation.schema.ts`
// but inlined so this file can run in a raw `server.handlers.POST`
// context (where TanStack Router's `redirect()` isn't wired).
//
// NOTE: `csrfToken` is accepted but not verified. The rest of the app
// doesn't render `CsrfTokenMeta` anywhere, so `useCsrfToken()` always
// returns an empty string and any server-side `verifyCsrfToken` call
// would 400 on an empty secret. When CSRF gets wired end-to-end,
// re-introduce the `verifyCsrfToken` call here to match.
const joinPostSchema = z.object({
  csrfToken: z.string().optional(),
  inviteToken: z.uuid(),
  nextPath: z.string().min(1),
});

function redirectResponse(
  url: string,
  request: Request,
  cookieHeaders?: Headers,
) {
  const headers = new Headers();
  headers.set('Location', new URL(url, request.url).toString());
  cookieHeaders?.forEach((value, key) => {
    headers.append(key, value);
  });
  return new Response(null, { status: 302, headers });
}

export const Route = createFileRoute('/join/')({
  component: JoinPage,
  validateSearch: (search: Record<string, unknown>) =>
    joinSearchSchema.parse(search),
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData();
        const parsed = joinPostSchema.safeParse(
          Object.fromEntries(formData.entries()),
        );

        if (!parsed.success) {
          return new Response('Invalid form data', { status: 400 });
        }

        const { inviteToken, nextPath } = parsed.data;

        const { client, headers: cookieHeaders } =
          getSupabaseServerClient(request);
        const auth = await requireUser(client);

        if (!auth.data) {
          return redirectResponse(auth.redirectTo, request, cookieHeaders);
        }

        const adminClient = getSupabaseServerAdminClient();

        // Verify the invitation belongs to this user's email before
        // calling the admin RPC — otherwise anyone who guesses a token
        // could add themselves.
        const { data: invitation, error: invitationError } = await adminClient
          .from('invitations')
          .select('email, organization_id')
          .eq('invite_token', inviteToken)
          .maybeSingle();

        if (invitationError || !invitation) {
          return new Response('Invitation not found', { status: 404 });
        }

        if (invitation.email !== auth.data.email) {
          return new Response('Invitation email does not match user email', {
            status: 403,
          });
        }

        const { error: acceptError } = await adminClient.rpc(
          'accept_invitation',
          {
            token: inviteToken,
            user_id: auth.data.id,
          },
        );

        if (acceptError) {
          const isUniqueViolation =
            acceptError.code === '23505' ||
            (typeof acceptError.message === 'string' &&
              acceptError.message.includes('duplicate key'));

          if (isUniqueViolation) {
            // User is already a member — send them to the organization
            // page with a marker so the UI can show a toast.
            const separator = nextPath.includes('?') ? '&' : '?';
            return redirectResponse(
              `${nextPath}${separator}alreadyMember=1`,
              request,
              cookieHeaders,
            );
          }

          throw acceptError;
        }

        return redirectResponse(nextPath, request, cookieHeaders);
      },
    },
  },
});

function JoinPage() {
  const search = Route.useSearch();
  const user = useUser();

  // Loading session — render a neutral shell so hydration doesn't flash.
  if (user.isPending) {
    return (
      <AuthLayoutShell Logo={AppLogo}>
        <p className="text-muted-foreground text-center text-sm">
          <Trans i18nKey="common:loading" defaults="Loading..." />
        </p>
      </AuthLayoutShell>
    );
  }

  // Not authenticated — bounce to sign-in with `next` pointing back here so
  // the user lands on `/join?invite_token=...` after they sign in.
  if (!user.data) {
    const nextUrl = search.invite_token
      ? `${pathsConfig.app.joinOrganization}?invite_token=${encodeURIComponent(search.invite_token)}`
      : pathsConfig.app.joinOrganization;
    return <Navigate to={pathsConfig.auth.signIn} search={{ next: nextUrl }} />;
  }

  if (!search.invite_token) {
    return (
      <AuthLayoutShell Logo={AppLogo}>
        <InviteNotFoundOrExpired />
      </AuthLayoutShell>
    );
  }

  return (
    <AuthLayoutShell Logo={AppLogo}>
      <JoinPageContent
        inviteToken={search.invite_token}
        email={user.data.email ?? ''}
        userId={user.data.id}
      />
    </AuthLayoutShell>
  );
}

function JoinPageContent({
  inviteToken,
  email,
  userId,
}: {
  inviteToken: string;
  email: string;
  userId: string;
}) {
  const query = useQuery({
    queryKey: ['invitation', inviteToken],
    queryFn: async () => {
      const client = getSupabaseBrowserClient();

      // RLS policy `invitations_read_self` allows the invitee to read
      // their own row because the `email` column matches the JWT email.
      const { data: invitation, error: invitationError } = await client
        .from('invitations')
        .select('id, organization_id')
        .eq('invite_token', inviteToken)
        .maybeSingle();

      if (invitationError || !invitation) {
        return null;
      }

      const { data: organization, error: organizationError } = await client
        .from('organizations')
        .select('id, name, slug, picture_url')
        .eq('id', invitation.organization_id)
        .single();

      if (organizationError || !organization) {
        return null;
      }

      const { data: alreadyMember } = await client.rpc(
        'is_organization_member',
        {
          organization_id: organization.id,
          user_id: userId,
        },
      );

      return {
        id: invitation.id,
        organization,
        alreadyMember: Boolean(alreadyMember),
      };
    },
  });

  if (query.isPending) {
    return (
      <p className="text-muted-foreground text-center text-sm">
        <Trans i18nKey="common:loading" defaults="Loading invitation..." />
      </p>
    );
  }

  if (!query.data) {
    return <InviteNotFoundOrExpired />;
  }

  if (query.data.alreadyMember) {
    return <AlreadyMemberNotice slug={query.data.organization.slug} />;
  }

  const signOutNext = `${pathsConfig.auth.signIn}?next=${encodeURIComponent(
    `${pathsConfig.app.joinOrganization}?invite_token=${inviteToken}`,
  )}`;

  return (
    <AcceptInvitationContainer
      inviteToken={inviteToken}
      email={email}
      invitation={{
        id: String(query.data.id),
        account: {
          id: query.data.organization.id,
          name: query.data.organization.name,
          picture_url: query.data.organization.picture_url,
        },
      }}
      paths={{
        signOutNext,
        // After accepting, LastProjectRedirect resolves the newly-joined
        // org's default project and navigates. Direct per-org landing
        // pages are replaced by the org-settings app (story 009).
        nextPath: pathsConfig.app.home,
      }}
    />
  );
}

function AlreadyMemberNotice({ slug: _slug }: { slug: string }) {
  const orgPath = pathsConfig.app.home;
  return (
    <div className="flex flex-col space-y-4 text-center">
      <Heading level={6}>
        <Trans
          i18nKey="organizations:alreadyAMember"
          defaults="You're already a member of this organization"
        />
      </Heading>
      <Button asChild>
        <a href={orgPath}>
          <Trans
            i18nKey="organizations:goToOrganization"
            defaults="Go to organization"
          />
        </a>
      </Button>
    </div>
  );
}

function InviteNotFoundOrExpired() {
  return (
    <div className="flex flex-col space-y-4 text-center">
      <Heading level={6}>
        <Trans
          i18nKey="organizations:inviteNotFoundOrExpired"
          defaults="Invitation not found or expired"
        />
      </Heading>
      <p className="text-muted-foreground text-sm">
        <Trans
          i18nKey="organizations:inviteNotFoundOrExpiredDescription"
          defaults="Ask the organization owner to send a fresh invitation."
        />
      </p>
      <Button asChild variant="outline">
        <Link to={pathsConfig.app.home}>
          <ArrowLeft className="mr-2 w-4" />
          <Trans i18nKey="organizations:backToHome" defaults="Back to home" />
        </Link>
      </Button>
    </div>
  );
}
