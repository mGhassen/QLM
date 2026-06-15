import { useEffect, useRef } from 'react';

import type { RouterState } from '@tanstack/react-router';
import { useRouterState } from '@tanstack/react-router';

import type { LoadingBarRef } from 'react-top-loading-bar';
import LoadingBar from 'react-top-loading-bar';

export function TopLoadingBarIndicator() {
  const ref = useRef<LoadingBarRef>(null);
  const runningRef = useRef(false);
  const status = useRouterState({ select: (s: RouterState) => s.status });

  useEffect(() => {
    const isIdle = status === 'idle';
    const isRouteLoading = status === 'pending';

    if (isRouteLoading) {
      ref.current?.continuousStart();
    }

    if (isIdle) {
      ref.current?.complete();
      runningRef.current = false;
    }
  }, [status]);

  if (typeof document === 'undefined') {
    return null;
  }

  return (
    <LoadingBar
      className={'bg-primary'}
      height={4}
      waitingTime={0}
      shadow
      color={''}
      ref={ref}
    />
  );
}
