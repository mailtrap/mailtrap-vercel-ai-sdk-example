import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mailtrap × Vercel AI SDK Example",
  description: "Send emails via Mailtrap using Vercel AI SDK tool calling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
