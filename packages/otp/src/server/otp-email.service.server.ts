import { z } from 'zod';

import { renderOtpEmail } from '@guepard/email-templates';
import { getMailer } from '@guepard/mailers';
import { getLogger } from '@guepard/shared/logger';

const EMAIL_SENDER = z
  .string({
    error: (issue) =>
      issue.input === undefined
        ? 'EMAIL_SENDER is required'
        : 'Expected string',
  })
  .min(1)
  .parse(process.env.EMAIL_SENDER);

const PRODUCT_NAME = z
  .string({
    error: (issue) =>
      issue.input === undefined
        ? 'VITE_PRODUCT_NAME is required'
        : 'Expected string',
  })
  .min(1)
  .parse(import.meta.env.VITE_PRODUCT_NAME);

/**
 * @name createOtpEmailService
 * @description Creates a new OtpEmailService
 * @returns {OtpEmailService}
 */
export function createOtpEmailService() {
  return new OtpEmailService();
}

/**
 * @name OtpEmailService
 * @description Service for sending OTP emails
 */
class OtpEmailService {
  async sendOtpEmail(params: { email: string; otp: string }) {
    const logger = await getLogger();
    const { email, otp } = params;
    const mailer = await getMailer();

    const { html, subject } = await renderOtpEmail({
      otp,
      productName: PRODUCT_NAME,
    });

    try {
      logger.info({ otp }, 'Sending OTP email...');

      await mailer.sendEmail({
        to: email,
        subject,
        html,
        from: EMAIL_SENDER,
      });

      logger.info({ otp }, 'OTP email sent');
    } catch (error) {
      logger.error({ otp, error }, 'Error sending OTP email');

      throw error;
    }
  }
}
