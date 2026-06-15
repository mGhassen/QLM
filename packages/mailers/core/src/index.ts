/**
 * @description Get the mailer based on the environment variable.
 */
export async function getMailer() {
  const { createResendMailer } = await import('@qlm/resend');

  return createResendMailer();
}
