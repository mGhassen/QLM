import { createFileRoute, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { AgentTabBody } from '@guepard/qwery-agent';
import { GetProjectService } from '@guepard/domain/services';

import { ProjectShellHost } from '@/shell/project-shell-host';
import { useWorkspace } from '@/lib/context/workspace-context';

export const Route = createFileRoute('/agent/$conversationSlug')({
  component: AgentShellTabRoute,
});

function AgentShellTabRoute() {
  const { conversationSlug } = useParams({
    from: '/agent/$conversationSlug',
  });
  const { repositories } = useWorkspace();

  const { data: conversation, isLoading: conversationLoading } = useQuery({
    queryKey: ['agent-route', 'conversation', conversationSlug],
    queryFn: () => repositories.conversation.findBySlug(conversationSlug),
  });

  const { data: project } = useQuery({
    queryKey: ['agent-route', 'project', conversation?.projectId],
    queryFn: async () => {
      if (!conversation) return null;
      return new GetProjectService(repositories.project).execute(
        conversation.projectId,
      );
    },
    enabled: !!conversation,
  });

  const { data: organization } = useQuery({
    queryKey: ['agent-route', 'organization', project?.organizationId],
    queryFn: async () => {
      if (!project) return null;
      return repositories.organization.findById(project.organizationId);
    },
    enabled: !!project,
  });

  if (conversationLoading) {
    return <CenteredSpinner />;
  }

  if (!conversation) {
    return <NotFound />;
  }

  if (!project || !organization) {
    return <CenteredSpinner />;
  }

  const tabId = `agent:${conversation.slug}`;
  const title = conversation.title || 'Conversation';
  const href = `/agent/${conversation.slug}`;

  return (
    <ProjectShellHost
      orgSlug={organization.slug}
      projectSlug={project.slug}
      organization={organization}
      project={project}
      activeTabId={tabId}
      virtualTab={{ id: tabId, title, href }}
    >
      <AgentTabBody conversationSlug={conversation.slug} />
    </ProjectShellHost>
  );
}

function CenteredSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2 text-center">
      <p className="text-sm font-semibold">Conversation not found</p>
      <p className="text-muted-foreground max-w-xs text-xs">
        The conversation you&apos;re trying to open doesn&apos;t exist or is not
        accessible to this account.
      </p>
    </div>
  );
}
