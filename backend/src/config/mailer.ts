const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || apiKey === 'xkeysib-xxxxxxxxxxxx') {
    console.log('[Mail] No valid BREVO_API_KEY — skipped:', options.to, options.subject);
    return;
  }

  try {
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'johndavidnzubechukwu008@gmail.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'CareerCode Academy';

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.html,
        ...(options.text ? { textContent: options.text } : {}),
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[Mail] Brevo API error:', response.status, errBody);
      return;
    }

    const result: any = await response.json();
    console.log('[Mail] Sent to', options.to, '— messageId:', result.messageId);
  } catch (err: any) {
    console.error('[Mail] Brevo exception:', err.message || err);
  }
}

export default { sendMail };
