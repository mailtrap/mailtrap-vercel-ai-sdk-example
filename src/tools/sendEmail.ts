import { tool } from "ai";
import { z } from "zod";

import { getMailtrapClient } from "../lib/mailtrap";
import { assertAllowedRecipient } from "../lib/recipientPolicy";

function resolveFromEmail(options?: { fromEmail?: string }): string {
  const fromEmail =
    options?.fromEmail ??
    process.env.DEFAULT_FROM_EMAIL ??
    process.env.MAILTRAP_FROM_EMAIL;

  if (!fromEmail) {
    throw new Error(
      "DEFAULT_FROM_EMAIL (or MAILTRAP_FROM_EMAIL) is not configured",
    );
  }

  return fromEmail;
}

export function createSendEmailTool(options?: {
  fromEmail?: string;
  fromName?: string;
}) {
  return tool({
    description:
      "Send a transactional email via Mailtrap. Use for welcome emails, notifications, etc.",
    inputSchema: z.object({
      to: z.string().email().describe("Recipient email address"),
      subject: z.string().min(1).describe("Email subject line"),
      text: z.string().optional().describe("Plain-text body"),
      html: z.string().optional().describe("HTML body"),
    }),
    execute: async ({ to, subject, text, html }) => {
      assertAllowedRecipient(to);

      const fromEmail = resolveFromEmail(options);
      const client = getMailtrapClient();
      const response = await client.send({
        from: {
          email: fromEmail,
          name: options?.fromName ?? "Demo App",
        },
        to: [{ email: to }],
        subject,
        text: text ?? `Welcome! (subject: ${subject})`,
        html,
      });

      return {
        success: response.success,
        messageId: response.message_ids[0],
        messageIds: response.message_ids,
      };
    },
  });
}
