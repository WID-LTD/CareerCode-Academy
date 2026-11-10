// Legacy Express mailer.
//
// The API is now served by the Cloudflare Worker, which owns transactional
// email through Cloudflare Email Service (see workers/src/email.ts).
// This stub keeps the old Express code compiling but never sends anything.
export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(options: MailOptions): Promise<void> {
  console.log('[Mail] skipped (email is handled by the Worker):', options.to, options.subject);
}
