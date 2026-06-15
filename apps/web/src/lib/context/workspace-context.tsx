import { createContext, useContext } from 'react';

import type { Repositories } from '@qlm/domain/repositories';

type WorkspaceContextValue = {
  repositories: Repositories;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

export { WorkspaceContext };
