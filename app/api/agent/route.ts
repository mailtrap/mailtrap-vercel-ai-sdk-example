import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs } from "ai";

import { createSendEmailTool } from "@/tools/sendEmail";

const DEFAULT_PROMPT =
  "send a welcome email to jane@example.com with subject Welcome";

const SYSTEM_PROMPT = `You are a helpful assistant that can send emails via Mailtrap.
When the user asks you to send an email, use the sendEmail tool.
After sending, confirm the delivery and include the messageId returned by the tool.`;

export async function POST(req: Request) {
  let prompt = DEFAULT_PROMPT;

  try {
    const body = await req.json();

    if (body?.prompt && typeof body.prompt === "string") {
      prompt = body.prompt;
    }
  } catch {
    // Use default prompt when body is missing or invalid.
  }

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    system: SYSTEM_PROMPT,
    prompt,
    tools: {
      sendEmail: createSendEmailTool(),
    },
    stopWhen: stepCountIs(5),
  });

  const sendEmailResult = result.toolResults.find(
    (toolResult) => toolResult.toolName === "sendEmail",
  );

  const messageId =
    sendEmailResult &&
    typeof sendEmailResult.output === "object" &&
    sendEmailResult.output !== null &&
    "messageId" in sendEmailResult.output
      ? String(
          (sendEmailResult.output as { messageId?: string }).messageId ?? "",
        )
      : undefined;

  return Response.json({
    text: result.text,
    messageId: messageId || undefined,
    toolCalls: result.toolCalls,
    toolResults: result.toolResults,
    steps: result.steps.map((step) => ({
      text: step.text,
      toolCalls: step.toolCalls,
      toolResults: step.toolResults,
    })),
  });
}
