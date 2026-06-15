/**
 * Shared helpers for auth Storybook stories.
 *
 * Provides:
 *  - A pre-initialised i18next instance with inline English translations
 *    covering every i18n key used by the auth components.
 *  - `withAuthProviders` – a Storybook Decorator that wraps each story in
 *    MemoryRouter, QueryClientProvider, AppEventsProvider, and
 *    I18nextProvider so auth components render without external setup.
 */
import * as React from 'react';

import type { Decorator } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';

import { AppEventsProvider } from '@guepard/shared/events';

// ---------------------------------------------------------------------------
// i18n setup
// ---------------------------------------------------------------------------

const authEn = {
  // Headings / alerts
  errorAlertHeading: 'Authentication error',

  // Errors
  'errors.default': 'An error occurred. Please try again.',
  'errors.invalid_credentials': 'Invalid email or password.',
  'errors.email_not_confirmed': 'Please confirm your email before signing in.',
  'errors.user_not_found': 'No account found with this email.',
  'errors.too_many_requests': 'Too many attempts. Please try again later.',
  'errors.link': 'Error sending link. Please try again.',
  'errors.generic': 'An error occurred.',
  'errors.weak_password': 'Password is too weak.',
  'errors.resetPasswordError': 'Error resetting password.',
  'errors.passwordsDoNotMatch': 'Passwords do not match.',
  'errors.minPasswordSpecialChars':
    'Password must contain at least one special character.',
  'errors.minPasswordNumbers': 'Password must contain at least one number.',
  'errors.uppercasePassword':
    'Password must contain at least one uppercase letter.',
  'errors.otp_expired': 'This OTP has expired, please request a new one.',

  // Email / magic link
  emailPlaceholder: 'you@example.com',
  sendingEmailLink: 'Sending email link…',
  sendLinkSuccessToast: 'Email link sent!',
  sendEmailLink: 'Send Email Link',
  sendLinkSuccess: 'Email Sent',
  sendLinkSuccessDescription: 'Check your inbox for a sign-in link.',
  resendLink: 'Resend Link',
  resendLinkSuccess: 'Email Sent',
  resendLinkSuccessDescription: "We've sent a new link to your email.",

  // Captcha
  verifyingCaptcha: 'Verifying…',

  // Sign in
  signInWithEmail: 'Sign In',
  signingIn: 'Signing in…',
  redirecting: 'Redirecting…',
  passwordForgottenQuestion: 'Forgot password?',

  // Sign up
  signUpWithEmail: 'Create Account',
  signingUp: 'Creating account…',
  emailConfirmationAlertHeading: 'Check your email',
  emailConfirmationAlertBody:
    "We've sent a confirmation link to your email. Please check your inbox.",
  repeatPassword: 'Repeat Password',
  repeatPasswordHint: 'Passwords must match and be at least 8 characters.',

  // Terms & Conditions
  acceptTermsAndConditions:
    'I accept the <TermsOfServiceLink>Terms of Service</TermsOfServiceLink> and <PrivacyPolicyLink>Privacy Policy</PrivacyPolicyLink>',
  termsOfService: 'Terms of Service',
  privacyPolicy: 'Privacy Policy',

  // Password reset
  passwordResetSubheading: 'Enter your email to receive a password reset link.',
  passwordResetLabel: 'Reset Password',
  passwordResetSuccessMessage:
    'Password reset email sent. Please check your inbox.',

  // OAuth
  signInWithProvider: 'Sign in with {{provider}}',
  orContinueWith: 'Or continue with',

  // MFA
  verifyCodeHeading: 'Verify your identity',

  // Marketing copy (auth layout right pane)
  deployDatabaseReady: 'Spin up isolated database environments in seconds',
  testEnvironmentsRealData: 'Test against real data without risk',
  branchDatabaseLikeCode: 'Branch your database the same way you branch code',
  resetSnapshotRollback: 'Snapshot, reset and rollback at any point',
  multiDatabaseSupport: 'PostgreSQL, MySQL, ClickHouse and more',
  plugStackSimpleAPI: 'Connect to your stack through a single API',
};

const accountEn = {
  invalidVerificationCodeHeading: 'Invalid Code',
  invalidVerificationCodeDescription:
    'The verification code is incorrect. Please try again.',
  verifyActivationCodeDescription:
    'Enter the 6-digit code from your authenticator app.',
  verifyingCode: 'Verifying code…',
  submitVerificationCode: 'Verify',
  loadingFactors: 'Loading authentication methods…',
  factorsListError: 'Error Loading Factors',
  factorsListErrorDescription:
    'Could not load your authentication methods. Please sign out and try again.',
  selectFactor: 'Select an authentication method',
  updatePasswordSuccessMessage: 'Password updated successfully!',
};

const commonEn = {
  emailAddress: 'Email Address',
  genericError: 'Something went wrong',
  retry: 'Try Again',
};

export const storybookI18n = i18next.createInstance();

storybookI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  resources: {
    en: {
      auth: authEn,
      account: accountEn,
      common: commonEn,
    },
  },
} as Parameters<typeof storybookI18n.init>[0]);

// ---------------------------------------------------------------------------
// QueryClient factory
// ---------------------------------------------------------------------------

export function createStoryQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

// ---------------------------------------------------------------------------
// Decorator
// ---------------------------------------------------------------------------

const CurrentStoryContext = React.createContext<React.ComponentType>(
  () => null,
);

function StoryRouteRoot({ queryClient }: { queryClient: QueryClient }) {
  const CurrentStory = React.useContext(CurrentStoryContext);

  return (
    <QueryClientProvider client={queryClient}>
      <AppEventsProvider>
        <I18nextProvider i18n={storybookI18n}>
          {React.createElement(CurrentStory)}
        </I18nextProvider>
      </AppEventsProvider>
    </QueryClientProvider>
  );
}

function AuthProvidersDecorator({ Story }: { Story: React.ComponentType }) {
  const queryClient = React.useMemo(() => createStoryQueryClient(), []);

  const router = React.useMemo(() => {
    const rootRoute = createRootRoute({
      component: () => <StoryRouteRoot queryClient={queryClient} />,
    });

    // Catch-all so any Link navigation resolves without a 404 crash
    const catchAllRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '$',
      component: () => null,
    });

    const history = createMemoryHistory({ initialEntries: ['/'] });

    return createRouter({
      routeTree: rootRoute.addChildren([catchAllRoute]),
      history,
    });
  }, [queryClient]);

  return (
    <CurrentStoryContext.Provider value={Story}>
      <RouterProvider router={router} />
    </CurrentStoryContext.Provider>
  );
}

export const withAuthProviders: Decorator = (Story: React.ComponentType) => (
  <AuthProvidersDecorator Story={Story} />
);
