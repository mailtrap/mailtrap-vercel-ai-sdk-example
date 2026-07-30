import { MailtrapClient } from "mailtrap";

const USER_AGENT =
  "mailtrap-vercel-ai-sdk-example (https://github.com/mailtrap/mailtrap-vercel-ai-sdk-example)";

let client: MailtrapClient | undefined;

export function getMailtrapClient(): MailtrapClient {
  const token = process.env.MAILTRAP_API_TOKEN;

  if (!token) {
    throw new Error("MAILTRAP_API_TOKEN is not configured");
  }

  if (!client) {
    client = new MailtrapClient({
      token,
      userAgent: USER_AGENT,
      ...(process.env.MAILTRAP_ACCOUNT_ID &&
      !Number.isNaN(Number(process.env.MAILTRAP_ACCOUNT_ID))
        ? { accountId: Number(process.env.MAILTRAP_ACCOUNT_ID) }
        : {}),
    });
  }

  return client;
}
