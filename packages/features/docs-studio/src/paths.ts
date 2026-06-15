export const projectStudioRoute = '/prj/$projectSlug/studio' as const;

export const docsPaths = {
  root: '/docs',
  preview: (slug: string) => `/docs/${slug}`,
  projectStudio: (projectSlug: string, slug?: string) =>
    slug
      ? `/prj/${projectSlug}/studio?tid=studio-doc:${encodeURIComponent(slug)}`
      : `/prj/${projectSlug}/studio`,
  api: {
    list: '/api/docs',
    doc: (slug: string) => `/api/docs/${slug}`,
    preview: (slug: string) => `/api/docs/${slug}/preview`,
    upload: (slug: string) => `/api/docs/${slug}/upload`,
    import: '/api/docs/import',
  },
} as const;
