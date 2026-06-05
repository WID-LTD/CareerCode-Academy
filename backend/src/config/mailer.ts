import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.log('Email sent (dev mode):', options.to, options.subject);
    return;
  }

  const { error } = await resend.emails.send({
    from: `CareerCode Academy <${process.env.RESEND_FROM || 'noreply@careercode.academy'}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  if (error) {
    console.error('Resend email error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export default resend;
