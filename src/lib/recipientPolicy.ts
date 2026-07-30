const EXAMPLE_DOMAIN = "@example.com";

export function assertAllowedRecipient(email: string): void {
  const normalized = email.trim().toLowerCase();

  if (normalized.endsWith(EXAMPLE_DOMAIN)) {
    return;
  }

  const allowedRecipient = process.env.ALLOWED_RECIPIENT_EMAIL?.trim().toLowerCase();

  if (allowedRecipient && normalized === allowedRecipient) {
    return;
  }

  throw new Error(
    `Recipient "${email}" is not allowed. Use an @example.com address or set ALLOWED_RECIPIENT_EMAIL to your own address.`,
  );
}
