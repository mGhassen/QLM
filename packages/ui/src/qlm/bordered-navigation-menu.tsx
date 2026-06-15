import { Link, useRouterState } from '@tanstack/react-router';

import { cn } from '../lib/utils';
import { Button } from '../shadcn/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from '../shadcn/navigation-menu';
import { Trans } from './trans';

export function BorderedNavigationMenu(
  props: React.PropsWithChildren<{
    className?: string;
  }>,
) {
  return (
    <NavigationMenu className={props.className}>
      <NavigationMenuList className={'relative h-full space-x-2'}>
        {props.children}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

export function BorderedNavigationMenuItem(props: {
  path: string;
  label: React.ReactNode | string;
  end?: boolean | ((path: string) => boolean);
  active?: boolean;
  className?: string;
  buttonClassName?: string;
}) {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const exact =
    typeof props.end === 'function' ? props.end(currentPath) : props.end;

  const isActive = exact
    ? currentPath === props.path
    : currentPath.startsWith(props.path);

  return (
    <NavigationMenuItem className={props.className}>
      <Button
        asChild
        variant={'ghost'}
        className={cn('relative active:shadow-sm', props.buttonClassName)}
      >
        <Link to={props.path}>
          <span
            className={cn({
              'text-secondary-foreground': isActive,
              'text-secondary-foreground/80 hover:text-secondary-foreground':
                !isActive,
            })}
          >
            {typeof props.label === 'string' ? (
              <Trans i18nKey={props.label} defaults={props.label} />
            ) : (
              props.label
            )}

            <span
              className={cn(
                'bg-primary animate-in fade-in zoom-in-90 absolute -bottom-2.5 left-0 hidden h-0.5 w-full',
                {
                  block: isActive,
                },
              )}
            />
          </span>
        </Link>
      </Button>
    </NavigationMenuItem>
  );
}
