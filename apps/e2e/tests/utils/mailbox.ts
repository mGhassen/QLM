import type { Page } from '@playwright/test';

/**
 * Thin wrapper around the Mailpit REST API that ships with recent
 * Supabase CLI versions (the bundled local SMTP + webmail). Default
 * port comes from `apps/web/supabase/config.toml`:
 *
 *   [inbucket]
 *   port = 54324
 *
 * The config key is still called `inbucket` for backwards compatibility,
 * but the server behind that port is Mailpit (v1.x). See
 * https://mailpit.axllent.org/docs/api-v1/ for the API reference.
 *
 * Overridable via the `MAILPIT_URL` env var if you change the Supabase
 * config locally.
 */
const MAILPIT_URL =
  process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';

type MailpitSummary = {
  ID: string;
  MessageID?: string;
  Snippet?: string;
  Subject?: string;
  To?: Array<{ Address: string; Name?: string }>;
  Created?: string;
};

type MailpitSearchResponse = {
  messages?: MailpitSummary[];
  messages_count?: number;
  total?: number;
};

type MailpitMessageDetail = {
  HTML?: string;
  Text?: string;
};

export class Mailbox {
  constructor(private readonly page: Page) {}

  /**
   * Finds the most recent message sent to `email` in Mailpit, pulls the
   * first link out of its body, and navigates the page there. Throws if
   * no message exists yet so the caller can retry via `expect.toPass`.
   */
  async visitConfirmLinkFor(
    email: string,
    { deleteAfter = true }: { deleteAfter?: boolean } = {},
  ) {
    const summary = await this.findLatestMessageTo(email);
    const detail = await this.fetchMessage(summary.ID);

    const link =
      extractFirstLink(detail.HTML ?? '') ??
      extractFirstLink(detail.Text ?? '');

    if (!link) {
      throw new Error(
        `Could not find a confirmation link in Mailpit message ${summary.ID} for ${email}`,
      );
    }

    if (deleteAfter) {
      await this.deleteMessage(summary.ID);
    }

    return this.page.goto(link);
  }

  private async findLatestMessageTo(email: string): Promise<MailpitSummary> {
    // Mailpit search syntax: `to:<address>` restricts to the given recipient.
    // `limit=1` + no explicit sort returns the newest first.
    const searchUrl = `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(
      `to:${email}`,
    )}&limit=1`;

    const response = await fetch(searchUrl);

    if (!response.ok) {
      throw new Error(
        `Mailpit search failed: ${response.status} ${response.statusText}`,
      );
    }

    const body = (await response.json()) as MailpitSearchResponse;
    const message = body.messages?.[0];

    if (!message?.ID) {
      throw new Error(`No Mailpit messages found for ${email} yet`);
    }

    return message;
  }

  private async fetchMessage(id: string): Promise<MailpitMessageDetail> {
    const response = await fetch(`${MAILPIT_URL}/api/v1/message/${id}`);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Mailpit message ${id}: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as MailpitMessageDetail;
  }

  private async deleteMessage(id: string): Promise<void> {
    // Best-effort cleanup — a failed delete shouldn't fail the test.
    await fetch(`${MAILPIT_URL}/api/v1/messages`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDs: [id] }),
    }).catch(() => {
      /* ignore */
    });
  }
}

/**
 * Scrapes the first http(s) link out of an HTML or plain-text email body.
 * Supabase confirmation emails contain a single `<a href="...">` pointing
 * at the verify/callback URL, so a regex is enough and avoids pulling in
 * an HTML parser dependency.
 */
function extractFirstLink(body: string): string | null {
  if (!body) {
    return null;
  }

  const hrefMatch = body.match(/href=["']([^"']+)["']/i);
  if (hrefMatch?.[1]) {
    return decodeHtmlEntities(hrefMatch[1]);
  }

  const urlMatch = body.match(/https?:\/\/[^\s<>"']+/i);
  return urlMatch?.[0] ? decodeHtmlEntities(urlMatch[0]) : null;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
