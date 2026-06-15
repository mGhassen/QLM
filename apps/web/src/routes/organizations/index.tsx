import { createFileRoute } from '@tanstack/react-router';

import { LastProjectRedirect } from '@/components/last-project-redirect';

/**
 * `/organizations/` used to render a list view. Phase 1 of RFC 0024
 * removes that page in favour of landing the user on their last project
 * for the active organization. The component resolves the destination
 * (or falls back to sign-in / zero-state) and issues the navigation.
 */
export const Route = createFileRoute('/organizations/')({
  component: LastProjectRedirect,
});
