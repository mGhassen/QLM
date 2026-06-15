const pathsConfig = {
  auth: {
    signIn: '/auth/sign-in',
    signUp: '/auth/sign-up',
    passwordReset: '/auth/password-reset',
    verify: '/auth/verify',
    callback: '/auth/callback',
    confirm: '/auth/confirm',
    callbackError: '/auth/callback-error',
    updatePassword: '/update-password',
  },
  app: {
    home: '/',
    joinOrganization: '/join',
    project: '/prj/$projectSlug',
  },
} as const;

export function createPath(template: string, slug: string) {
  return template.replaceAll('$slug', slug);
}

/** Project root URL — resolves org via the project entity. */
export function createProjectPath(projectSlug: string): string {
  return `/prj/${projectSlug}`;
}

/** Contextual app URL inside a project shell (e.g. /prj/my-proj/notebook). */
export function createProjectAppPath(
  projectSlug: string,
  routeBase: string,
): string {
  return `/prj/${projectSlug}/${routeBase}`;
}

/** Flat short URL (e.g., `/notebook/my-slug`). */
export function createFlatPath(prefix: string, ...params: string[]): string {
  return `/${prefix}/${params.join('/')}`;
}

export default pathsConfig;
