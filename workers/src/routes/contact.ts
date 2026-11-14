import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, statusOf } from '../route-utils';
import { sendEmail } from '../email';

const contact = new Hono<{ Bindings: Env }>();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/v1/contact — public contact form, stored and emailed to support.
contact.post('/', async (c) => {
  try {
    const body: any = await c.req.json().catch(() => ({}));
    // Honeypot: bots fill hidden fields. Return success without storing.
    if (body.website) return c.json({ success: true, message: 'Message received' });

    const name = String(body.name || '').trim().slice(0, 120);
    const email = String(body.email || '').trim().toLowerCase().slice(0, 180);
    const subject = String(body.subject || 'Website contact').trim().slice(0, 180);
    const message = String(body.message || '').trim().slice(0, 5000);

    if (name.length < 1) return fail(c, 400, 'Your name is required');
    if (!EMAIL_RE.test(email)) return fail(c, 400, 'A valid email address is required');
    if (message.length < 5) return fail(c, 400, 'Please write a short message');

    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `INSERT INTO contact_messages (name, email, subject, message)
       VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
      [name, email, subject, message]
    );

    const to = (c.env as any).CONTACT_EMAIL || 'contact@widltd.com.ng';
    c.executionCtx.waitUntil(sendEmail(c.env, {
      to,
      replyTo: email,
      subject: `Website contact: ${subject}`,
      html: `<h2>New website message</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
        <p style="color:#6b7280;font-size:12px">Stored as contact message ${rows[0].id}</p>`,
      text: `New website message\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
    }).catch(() => {}));

    return c.json({ success: true, message: 'Message received', data: { id: rows[0].id } }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to send message');
  }
});

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default contact;
