import { createFileRoute } from '@tanstack/react-router';

import { LastProjectRedirect } from '@/components/last-project-redirect';

export const Route = createFileRoute('/')({
  component: LastProjectRedirect,
});
