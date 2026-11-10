import type { Env } from './env';

// Single transactional-email entry point.
//
// Preferred: Cloudflare Email Service binding (`send_email` -> env.EMAIL).
//   NOTE: outbound sending requires the Workers Paid plan on Cloudflare.
// Fallback: Resend REST API (free tier) when RESEND_API_KEY is set.
// If neither is configured the call is a logged no-op so flows never break.
//
// Brevo has been removed entirely.

export interface MailAttachment {
  filename: string;
  content: string | ArrayBuffer | ArrayBufferView;
  type: string;
  disposition?: 'attachment' | 'inline';
}

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}

function fromAddress(env: Env): string {
  return env.MAIL_FROM || 'CareerCode Academy <noreply@careercode.com.ng>';
}

export async function sendEmail(env: Env, input: MailInput): Promise<{ ok: boolean; provider: string; id?: string; error?: string }> {
  const from = fromAddress(env);

  if (env.EMAIL) {
    try {
      const result: any = await env.EMAIL.send({
        to: input.to,
        from,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo,
        attachments: input.attachments,
      });
      return { ok: true, provider: 'cloudflare', id: result?.messageId };
    } catch (e: any) {
      console.error(JSON.stringify({ src: 'email', provider: 'cloudflare', error: e?.code || e?.message }));
      return { ok: false, provider: 'cloudflare', error: e?.message };
    }
  }

  if (env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
          reply_to: input.replyTo,
          attachments: input.attachments?.map((a) => ({
            filename: a.filename,
            content: typeof a.content === 'string' ? a.content : undefined,
            content_type: a.type,
          })),
        }),
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(JSON.stringify({ src: 'email', provider: 'resend', status: res.status, error: json?.message }));
        return { ok: false, provider: 'resend', error: json?.message };
      }
      return { ok: true, provider: 'resend', id: json?.id };
    } catch (e: any) {
      console.error(JSON.stringify({ src: 'email', provider: 'resend', error: e?.message }));
      return { ok: false, provider: 'resend', error: e?.message };
    }
  }

  console.log(JSON.stringify({ src: 'email', skipped: true, reason: 'no provider configured', to: input.to, subject: input.subject }));
  return { ok: false, provider: 'none', error: 'No email provider configured' };
}

// ── Templates ─────────────────────────────────────────────────────────────

function wrap(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:Inter,Arial,sans-serif;color:#111827">
  <div style="max-width:560px;margin:0 auto;padding:28px 20px">
    <div style="text-align:center;margin-bottom:18px;font-weight:800;font-size:18px;color:#4f46e5">CareerCode Academy</div>
    <div style="background:#fff;border-radius:16px;padding:28px;border:1px solid #e5e7eb">
      <h1 style="font-size:20px;margin:0 0 14px">${title}</h1>
      ${body}
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:18px">
      WID LTD · RC 8824091 · Agbara, Ogun State, Nigeria
    </p>
  </div></body></html>`;
}

export const mail = {
  verification(env: Env, to: string, code: string) {
    const link = `${env.FRONTEND_URL}/verify-email/${code}`;
    return sendEmail(env, {
      to,
      subject: `Your verification code: ${code}`,
      html: wrap('Verify your email', `<p>Your verification code is:</p>
        <p style="font-size:32px;letter-spacing:6px;font-weight:700">${code}</p>
        <p><a href="${link}" style="color:#4f46e5">Verify instantly</a> — the code expires in 24 hours.</p>`),
      text: `Your CareerCode verification code is ${code}. Verify: ${link}`,
    });
  },
  welcome(env: Env, to: string, name: string) {
    return sendEmail(env, {
      to,
      subject: 'Welcome to CareerCode Academy',
      html: wrap(`Welcome, ${name || 'there'}!`, `<p>Your email is verified. You can now enrol in courses, join communities and start learning.</p>
        <p><a href="${env.FRONTEND_URL}/student/dashboard" style="color:#4f46e5">Go to your dashboard</a></p>`),
    });
  },
  passwordReset(env: Env, to: string, token: string) {
    const link = `${env.FRONTEND_URL}/reset-password/${encodeURIComponent(token)}`;
    return sendEmail(env, {
      to,
      subject: 'Reset your CareerCode password',
      html: wrap('Reset your password', `<p>This link is valid for 15 minutes.</p>
        <p><a href="${link}" style="color:#4f46e5">Reset password</a></p>
        <p>If you didn't request this, ignore this email.</p>`),
      text: `Reset your password: ${link}`,
    });
  },
  roleChanged(env: Env, to: string, name: string, role: string) {
    const dash = role === 'instructor' ? 'instructor' : role === 'admin' || role === 'super_admin' ? 'admin' : 'student';
    return sendEmail(env, {
      to,
      subject: `Your CareerCode role is now ${role.replace('_', ' ')}`,
      html: wrap('Your role has changed', `<p>Hi ${name || 'there'}, an administrator set your role to <strong>${role.replace('_', ' ')}</strong>.</p>
        <p><a href="${env.FRONTEND_URL}/${dash}/dashboard" style="color:#4f46e5">Open your new dashboard</a></p>`),
    });
  },
  applicationReceived(env: Env, to: string, name: string) {
    return sendEmail(env, {
      to,
      subject: 'We received your instructor application',
      html: wrap('Application received', `<p>Thanks ${name || 'there'} — your instructor application is in review.</p>
        <p>We'll email you as soon as a decision is made.</p>`),
    });
  },
  applicationApproved(env: Env, to: string, name: string, setupToken?: string) {
    const link = setupToken ? `${env.FRONTEND_URL}/auth/set-password/${encodeURIComponent(setupToken)}` : `${env.FRONTEND_URL}/login`;
    return sendEmail(env, {
      to,
      subject: 'You are approved as a CareerCode instructor',
      html: wrap('Welcome aboard!', `<p>Hi ${name || 'there'}, your instructor application was approved.</p>
        <p><a href="${link}" style="color:#4f46e5">${setupToken ? 'Set your password' : 'Sign in'}</a></p>`),
    });
  },
  enrollment(env: Env, to: string, name: string, course: string, duration?: string) {
    return sendEmail(env, {
      to,
      subject: `You're enrolled in ${course}`,
      html: wrap('Enrollment confirmed', `<p>Hi ${name || 'there'}, you now have access to <strong>${course}</strong>.</p>
        ${duration ? `<p>Estimated duration: ${duration}.</p>` : ''}
        <p><a href="${env.FRONTEND_URL}/student/courses" style="color:#4f46e5">Start learning</a></p>`),
    });
  },
  invoice(env: Env, to: string, name: string, details: { reference: string; amount: string; course: string; date: string }, pdf?: ArrayBuffer) {
    return sendEmail(env, {
      to,
      subject: `Receipt for ${details.course}`,
      html: wrap('Payment receipt', `<p>Hi ${name || 'there'}, thanks for your payment.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#6b7280">Reference</td><td style="text-align:right">${details.reference}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Course</td><td style="text-align:right">${details.course}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Amount</td><td style="text-align:right;font-weight:700">${details.amount}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Date</td><td style="text-align:right">${details.date}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:12px;margin-top:16px">WID LTD · RC 8824091</p>`),
      attachments: pdf ? [{ filename: `receipt-${details.reference}.pdf`, content: pdf, type: 'application/pdf' }] : undefined,
    });
  },
  accountInvite(env: Env, to: string, name: string, role: string, token: string) {
    const link = `${env.FRONTEND_URL}/auth/set-password/${encodeURIComponent(token)}`;
    return sendEmail(env, {
      to,
      subject: 'Your CareerCode Academy account is ready',
      html: wrap('Set up your account', `<p>Hi ${name || 'there'}, an account was created for you as <strong>${role.replace('_', ' ')}</strong>.</p>
        <p><a href="${link}" style="color:#4f46e5">Set your password</a> (valid for 24 hours).</p>`),
      text: `Set your password: ${link}`,
    });
  },
  communityRequest(env: Env, to: string, name: string, community: string, approved: boolean) {
    return sendEmail(env, {
      to,
      subject: approved ? `You're in: ${community}` : `Request update: ${community}`,
      html: wrap(approved ? 'Request approved' : 'Request reviewed', `<p>Hi ${name || 'there'}, your request to join <strong>${community}</strong> was ${approved ? 'approved' : 'declined'}.</p>`),
    });
  },
};
