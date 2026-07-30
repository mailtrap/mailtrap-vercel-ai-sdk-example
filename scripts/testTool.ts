import { readFileSync } from "fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { createSendEmailTool } from "../src/tools/sendEmail";
import { assertAllowedRecipient } from "../src/lib/recipientPolicy";

async function main() {
  console.log("--- recipient policy ---");
  assertAllowedRecipient("jane@example.com");
  console.log("ok: jane@example.com allowed");

  try {
    assertAllowedRecipient("user@gmail.com");
    console.error("FAIL: gmail should be blocked");
    process.exit(1);
  } catch {
    console.log("ok: user@gmail.com blocked");
  }

  console.log("--- sendEmail tool (Mailtrap) ---");
  const tool = createSendEmailTool();
  if (!tool.execute) {
    throw new Error("tool.execute missing");
  }

  try {
    const result = await tool.execute(
      {
        to: "jane@example.com",
        subject: "Welcome",
        text: "Welcome to the Mailtrap × Vercel AI SDK demo!",
      },
      { toolCallId: "test-1", messages: [] },
    );
    console.log("ok: tool result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("send failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

main();
