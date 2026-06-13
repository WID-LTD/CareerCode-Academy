let resendInstance: any = null;

function getResend() {
  if (!resendInstance) {
    const key = process.env.RESEND_API_KEY;
    if (!key || key === 're_xxxxxxxxxxxx') {
      return null;
    }
    const { Resend } = require('resend');
    resendInstance = new Resend(key);
  }
  return resendInstance;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const resend = getResend();

  if (!resend || process.env.NODE_ENV === 'development') {
    console.log('[Mail] Dev mode - skipped:', options.to, options.subject);
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: `CareerCode Academy <${process.env.RESEND_FROM || 'noreply@careercode.academy'}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error('[Mail] Resend error:', error);
    }
  } catch (err) {
    console.error('[Mail] Resend exception:', err);
  }
}

export default { sendMail };
