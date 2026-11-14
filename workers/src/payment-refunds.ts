import type { Env } from './env';
import { getDb } from './db';
import { sendEmail } from './email';

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeout = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export interface RefundResult {
  payment: any;
  providerRefunded: boolean;
  providerMessage: string;
  enrollmentRevoked: boolean;
}

/**
 * Refund a payment at the provider, revoke course access, notify the learner,
 * and return a clear result for the admin UI. Provider failures are surfaced
 * instead of being silently treated as a successful refund.
 */
export async function refundPayment(env: Env, paymentId: string, reason?: string): Promise<RefundResult> {
  const db = getDb(env);
  const { rows } = await db.query<any>('SELECT * FROM payments WHERE id = $1', [paymentId]);
  const payment = rows[0];
  if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404 });
  if (payment.status === 'refunded') {
    return { payment, providerRefunded: false, providerMessage: 'Payment is already refunded', enrollmentRevoked: false };
  }
  if (payment.status !== 'completed') {
    throw Object.assign(new Error('Only completed payments can be refunded'), { statusCode: 400 });
  }

  let providerRefunded = false;
  let providerMessage = 'Provider refund skipped (no provider credentials)';

  try {
    if (payment.provider === 'paystack' && env.PAYSTACK_SECRET_KEY) {
      const res = await fetchWithTimeout('https://api.paystack.co/refund', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transaction: payment.reference, merchant_note: reason || 'Admin refund' }),
      });
      const json: any = await res.json().catch(() => ({}));
      providerRefunded = res.ok && !!json.status;
      providerMessage = json.message || (providerRefunded ? 'Refund submitted to Paystack' : 'Paystack refund failed');
    } else if (payment.provider === 'flutterwave' && env.FLUTTERWAVE_SECRET_KEY) {
      // Resolve the transaction id from the original reference, then refund it.
      const verify = await fetchWithTimeout(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(payment.reference)}`,
        { headers: { Authorization: `Bearer ${env.FLUTTERWAVE_SECRET_KEY}` } }
      );
      const verified: any = await verify.json().catch(() => ({}));
      const transactionId = verified?.data?.id;
      if (!transactionId) {
        providerMessage = verified?.message || 'Could not find the Flutterwave transaction';
      } else {
        const res = await fetchWithTimeout(`https://api.flutterwave.com/v3/transactions/${transactionId}/refund`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.FLUTTERWAVE_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ amount: Number(payment.amount), comments: reason || 'Admin refund' }),
        });
        const json: any = await res.json().catch(() => ({}));
        providerRefunded = res.ok && String(json.status).toLowerCase() === 'success';
        providerMessage = json.message || (providerRefunded ? 'Refund submitted to Flutterwave' : 'Flutterwave refund failed');
      }
    }
  } catch (e: any) {
    providerMessage = e?.message || 'Provider refund failed';
  }

  // Only mark locally refunded after a successful provider refund. If the
  // provider call failed, leave the payment completed so the admin can retry.
  if (!providerRefunded) {
    throw Object.assign(new Error(providerMessage), { statusCode: 502 });
  }

  let priorMeta: any = {};
  try { priorMeta = typeof payment.metadata === 'string' ? JSON.parse(payment.metadata || '{}') : (payment.metadata || {}); } catch { priorMeta = {}; }
  await db.query(
    `UPDATE payments SET status = 'refunded', metadata = $1 WHERE id = $2`,
    [JSON.stringify({ ...priorMeta, refund: { reason: reason || null, providerMessage, at: new Date().toISOString() } }), payment.id]
  );

  let enrollmentRevoked = false;
  if (payment.course_id) {
    const deleted = await db.query<any>(
      'DELETE FROM enrollments WHERE user_id = $1 AND course_id = $2 RETURNING id',
      [payment.user_id, payment.course_id]
    );
    enrollmentRevoked = deleted.rows.length > 0;
  } else {
    // Bundle refunds revoke every course allocated to this payment.
    const allocated = await db.query<any>('SELECT course_id FROM payment_courses WHERE payment_id = $1', [payment.id]);
    for (const row of allocated.rows) {
      const deleted = await db.query<any>(
        'DELETE FROM enrollments WHERE user_id = $1 AND course_id = $2 RETURNING id',
        [payment.user_id, row.course_id]
      );
      if (deleted.rows.length) enrollmentRevoked = true;
    }
  }

  await db.query(
    `INSERT INTO notifications (user_id, title, message, type, link)
     VALUES ($1, 'Payment refunded', $2, 'payment', '/student/dashboard')`,
    [payment.user_id, `Your payment ${payment.reference} was refunded. Course access has been revoked.`]
  ).catch(() => {});

  try {
    const user = (await db.query<any>('SELECT name, email FROM users WHERE id = $1', [payment.user_id])).rows[0];
    if (user?.email) {
      await sendEmail(env, {
        to: user.email,
        subject: `Refund processed for ${payment.reference}`,
        html: `<p>Hi ${user.name || 'there'},</p><p>Your payment <strong>${payment.reference}</strong> has been refunded. Course access has been revoked.</p><p>If you believe this is a mistake, contact support.</p>`,
        text: `Your payment ${payment.reference} has been refunded. Course access has been revoked.`,
      }).catch(() => {});
    }
  } catch { /* email is best-effort */ }

  const updated = (await db.query<any>('SELECT * FROM payments WHERE id = $1', [payment.id])).rows[0];
  return { payment: updated, providerRefunded, providerMessage, enrollmentRevoked };
}
