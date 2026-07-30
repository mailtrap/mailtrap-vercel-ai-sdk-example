# Mailtrap × Vercel AI SDK Example

A minimal [Next.js](https://nextjs.org) example showing how to register [Mailtrap](https://mailtrap.io) as a [Vercel AI SDK](https://sdk.vercel.ai) `tool()`. An LLM receives a prompt like *"send a welcome email to jane@example.com with subject Welcome"*, calls the `sendEmail` tool, and returns the Mailtrap `message_id`.

Deployable to [Vercel](https://vercel.com).

## What this repo is

This example wires Mailtrap into the AI SDK **tool-calling loop** (`generateText` / `streamText`). It is **not** a Chat SDK adapter.

For comparison, [`resend/resend-chat-sdk`](https://github.com/resend/resend-chat-sdk) is a bidirectional email adapter for the Vercel Chat SDK (inbound webhooks + outbound replies). This repo solves a different problem: giving an LLM a `sendEmail` tool it can call during a generation step.

Related Mailtrap projects:

- [`mailtrap-nodejs`](https://github.com/railsware/mailtrap-nodejs) — official Node.js SDK (`mailtrap` on npm)
- [`mailtrap-mcp`](https://github.com/mailtrap/mailtrap-mcp) — official MCP server (same token / `DEFAULT_FROM_EMAIL` conventions)

## Prerequisites

1. **Mailtrap API token** with email-sending permissions — create one at [mailtrap.io/settings/api-tokens](https://mailtrap.io/settings/api-tokens).
2. **Verified sending domain** (or a Mailtrap demo domain that allows sending to your own account email) — see [Sending Domain Setup](https://docs.mailtrap.io/email-api-smtp/setup/sending-domain).
3. **OpenAI API key** for the demo model (`gpt-4o-mini`).

## Setup

```bash
cp .env.example .env.local
# Fill in OPENAI_API_KEY, MAILTRAP_API_TOKEN, DEFAULT_FROM_EMAIL

pnpm install
pnpm dev
```

npm and yarn also work if you prefer them over pnpm.

## Demo

```bash
curl -X POST http://localhost:3000/api/agent \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"send a welcome email to jane@example.com with subject Welcome"}'
```

Expected flow:

1. The model calls the `sendEmail` tool with `to`, `subject`, and body fields.
2. The tool sends via the Mailtrap Email API (`POST https://send.api.mailtrap.io/api/send`).
3. The tool returns `{ success: true, messageId: "<uuid>", messageIds: ["<uuid>"] }`.
4. The model replies confirming the send and includes the `messageId`.

Example response shape:

```json
{
  "text": "I've sent the welcome email to jane@example.com. Message ID: 0c7fd939-02cf-11ed-88c2-0a58a9feac02",
  "messageId": "0c7fd939-02cf-11ed-88c2-0a58a9feac02",
  "toolCalls": [{ "toolName": "sendEmail", "input": { "to": "jane@example.com", "subject": "Welcome", "text": "..." } }],
  "toolResults": [{ "toolName": "sendEmail", "output": { "success": true, "messageId": "...", "messageIds": ["..."] } }],
  "steps": [...]
}
```

To exercise the Mailtrap tool without OpenAI:

```bash
pnpm test:tool
```

## Safety

Recipients are restricted before any Mailtrap API call:

- Addresses ending in `@example.com` (e.g. `jane@example.com`)
- The exact address in `ALLOWED_RECIPIENT_EMAIL` (optional — use your own inbox for live testing)

All other addresses are rejected.

## Tool definition

The core deliverable is `createSendEmailTool()` in [`src/tools/sendEmail.ts`](src/tools/sendEmail.ts):

```ts
import { tool } from "ai";
import { z } from "zod";

import { getMailtrapClient } from "../lib/mailtrap";
import { assertAllowedRecipient } from "../lib/recipientPolicy";

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

      const fromEmail =
        options?.fromEmail ??
        process.env.DEFAULT_FROM_EMAIL ??
        process.env.MAILTRAP_FROM_EMAIL;
      if (!fromEmail) {
        throw new Error(
          "DEFAULT_FROM_EMAIL (or MAILTRAP_FROM_EMAIL) is not configured",
        );
      }

      const client = getMailtrapClient();
      const response = await client.send({
        from: { email: fromEmail, name: options?.fromName ?? "Demo App" },
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
```

## Using with `generateText`

```ts
import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs } from "ai";

import { createSendEmailTool } from "./src/tools/sendEmail";

const result = await generateText({
  model: openai("gpt-4o-mini"),
  system:
    "When asked to send email, use the sendEmail tool and report the messageId.",
  prompt: "send a welcome email to jane@example.com with subject Welcome",
  tools: {
    sendEmail: createSendEmailTool(),
  },
  stopWhen: stepCountIs(5),
});

console.log(result.text);
console.log(result.toolResults);
```

`stopWhen: stepCountIs(5)` enables the multi-step tool loop: the SDK executes the tool, feeds the result back to the model, and continues until no more tool calls are needed.

## Using with `streamText`

```ts
import { openai } from "@ai-sdk/openai";
import { streamText, stepCountIs } from "ai";

import { createSendEmailTool } from "./src/tools/sendEmail";

const result = streamText({
  model: openai("gpt-4o-mini"),
  system:
    "When asked to send email, use the sendEmail tool and report the messageId.",
  prompt: "send a welcome email to jane@example.com with subject Welcome",
  tools: {
    sendEmail: createSendEmailTool(),
  },
  stopWhen: stepCountIs(5),
});

for await (const part of result.textStream) {
  process.stdout.write(part);
}
```

In a Next.js App Router route, pipe the stream to the client with `result.toTextStreamResponse()` or `result.toUIMessageStreamResponse()` for chat UIs.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key for the demo model |
| `MAILTRAP_API_TOKEN` | Yes | Mailtrap API token (same as [mailtrap-mcp](https://github.com/mailtrap/mailtrap-mcp)) |
| `DEFAULT_FROM_EMAIL` | Yes* | Sender address on a verified domain (*or `MAILTRAP_FROM_EMAIL`) |
| `MAILTRAP_FROM_EMAIL` | No | Alias for `DEFAULT_FROM_EMAIL` (accepted for convenience) |
| `ALLOWED_RECIPIENT_EMAIL` | No | Your own address for live testing outside `@example.com` |
| `MAILTRAP_ACCOUNT_ID` | No | Passed through to the SDK client when set |

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Add the environment variables from `.env.example` in Project Settings → Environment Variables.
4. Deploy — the `/api/agent` route works without code changes.

## Project structure

```
mailtrap-vercel-ai-sdk-example/
├── app/
│   ├── api/agent/route.ts   # Runnable demo endpoint
│   ├── layout.tsx
│   └── page.tsx
├── src/
│   ├── lib/
│   │   ├── mailtrap.ts          # MailtrapClient factory (+ userAgent)
│   │   └── recipientPolicy.ts   # @example.com safety guard
│   └── tools/
│       └── sendEmail.ts         # createSendEmailTool() — the AI SDK tool()
├── scripts/
│   └── testTool.ts              # Integration test without OpenAI
├── .env.example
├── LICENSE.txt
└── README.md
```

## License

MIT — see [LICENSE.txt](LICENSE.txt).

## References

- [Mailtrap API docs](https://docs.mailtrap.io/developers)
- [Vercel AI SDK docs](https://sdk.vercel.ai)
- [Vercel AI SDK — Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [mailtrap-nodejs](https://github.com/railsware/mailtrap-nodejs) — official Mailtrap Node.js client
- [mailtrap-mcp](https://github.com/mailtrap/mailtrap-mcp) — official Mailtrap MCP server
