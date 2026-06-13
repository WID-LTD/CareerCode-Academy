import { TransactionalEmailsApi, SendSmtpEmail, TransactionalEmailsApiApiKeys } from '@getbrevo/brevo';

let brevoInstance: TransactionalEmailsApi | null = null;

function getBrevo(): TransactionalEmailsApi | null {
  if (!brevoInstance) {
    const key = process.env.BREVO_API_KEY;
    if (!key || key === 'xkeysib-xxxxxxxxxxxx') {
      return null;
    }
    brevoInstance = new TransactionalEmailsApi();
    brevoInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, key);
  }
  return brevoInstance;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const brevo = getBrevo();

  if (!brevo || process.env.NODE_ENV === 'development') {
    console.log('[Mail] Dev mode - skipped:', options.to, options.subject);
    return;
  }

  try {
    const email = new SendSmtpEmail();
    email.subject = options.subject;
    email.htmlContent = options.html;
    email.sender = {
      name: 'CareerCode Academy',
      email: process.env.BREVO_FROM || 'noreply@careercode.academy',
    };
    email.to = [{ email: options.to }];

    if (options.text) {
      email.textContent = options.text;
    }

    const response = await brevo.sendTransacEmail(email);
    console.log('[Mail] Sent via Brevo:', response.body?.messageId || 'OK');
  } catch (err: any) {
    console.error('[Mail] Brevo exception:', err.response?.body || err.message || err);
  }
}

export default { sendMail };
