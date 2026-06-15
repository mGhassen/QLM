import { useMemo } from 'react';

import { WorkspaceContext } from '@/lib/context/workspace-context';
import { createRepositories } from '@/lib/repositories-factory';

export function WorkspaceProvider(props: React.PropsWithChildren) {
  const contextValue = useMemo(() => {
    return { repositories: createRepositories() };
  }, []);

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {props.children}
    </WorkspaceContext.Provider>
  );
}
