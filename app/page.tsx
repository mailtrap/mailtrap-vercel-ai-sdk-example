import { headers } from "next/headers";

export default async function Home() {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const origin = `${protocol}://${host}`;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Mailtrap × Vercel AI SDK Example</h1>
      <p>
        POST to <code>/api/agent</code> with a prompt to send an email via
        Mailtrap tool calling.
      </p>
      <pre
        style={{
          background: "#f4f4f4",
          padding: "1rem",
          borderRadius: "4px",
          overflow: "auto",
        }}
      >
        {`curl -X POST ${origin}/api/agent \\
  -H 'Content-Type: application/json' \\
  -d '{"prompt":"send a welcome email to jane@example.com with subject Welcome"}'`}
      </pre>
    </main>
  );
}
