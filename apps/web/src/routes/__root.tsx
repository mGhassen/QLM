import '../../styles/global.css';

import appConfig from '@/config/app.config';
import { RootProviders } from '@/providers/root-providers';
import type { RouterAppContext } from '@/router';
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';

const siteUrl = appConfig.url;
const name = appConfig.name;

const structuredData = {
  name,
  url: siteUrl,
  logo: `${siteUrl}/images/favicon/favicon-150x150.png`,
  '@context': 'https://schema.org',
  '@type': 'Organization',
};

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: appConfig.title },
      { name: 'description', content: appConfig.description },
      { name: 'msapplication-TileColor', content: '#ffffff' },
      { name: 'theme-color', content: appConfig.themeColor },
      { property: 'og:title', content: name },
      { property: 'og:description', content: appConfig.description },
      { property: 'og:site_name', content: name },
      { property: 'twitter:title', content: name },
      { property: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [
      {
        rel: 'apple-touch-icon',
        sizes: '144x144',
        href: '/images/favicon/apple-touch-icon.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/images/favicon/favicon-16x16.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/images/favicon/favicon-32x32.png',
      },
      { rel: 'manifest', href: '/images/favicon/site.webmanifest' },
      {
        rel: 'mask-icon',
        href: '/images/favicon/safari-pinned-tab.svg',
        color: '#000000',
      },
      { rel: 'dns-prefetch', href: '//fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com' },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(structuredData),
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <RootDocument>
      <RootProviders queryClient={queryClient}>
        <Outlet />
      </RootProviders>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
