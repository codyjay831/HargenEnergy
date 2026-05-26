import "server-only";

/**
 * Optional SMS reminders (Slice 9). Hard-gated — returns error when not configured.
 */

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_FROM_NUMBER?.trim(),
  );
}

export async function sendSmsMessage(input: {
  to: string;
  body: string;
  smsRemindersEnabled: boolean;
}): Promise<{ success: true } | { error: string }> {
  if (!input.smsRemindersEnabled) {
    return { error: "SMS reminders are disabled." };
  }
  if (!isSmsConfigured()) {
    return { error: "SMS provider is not configured." };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN!.trim();
  const from = process.env.TWILIO_FROM_NUMBER!.trim();

  const params = new URLSearchParams({
    To: input.to,
    From: from,
    Body: input.body,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    return { error: `SMS send failed: ${text}` };
  }

  return { success: true };
}
