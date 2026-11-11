import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, statusOf } from '../route-utils';
import { validateDiscountCode, markDiscountCodeUsed } from '../gamification';
import { receiptPdf } from '../receipt';
import { mail } from '../email';
import { initializeBundlePayment, enrollBundleCourses } from '../bundle-payments';
import * as LP from '../learning-paths';
import { isEnabled } from '../feature-flags';

const payments = new Hono<{ Bindings: Env }>();

// Supported currencies + which gateway can charge them (backend/src/utils/currency.ts)
const CURRENCIES: Record<string, { symbol: string; gateways: string[] }> = {
  NGN: { symbol: '₦', gateways: ['paystack', 'flutterwave'] },
  USD: { symbol: '$', gateways: ['paystack', 'flutterwave'] },
  GHS: { symbol: 'GH₵', gateways: ['paystack', 'flutterwave'] },
  KES: { symbol: 'KSh', gateways: ['paystack', 'flutterwave'] },
  ZAR: { symbol: 'R', gateways: ['paystack', 'flutterwave'] },
  GBP: { symbol: '£', gateways: ['flutterwave'] },
  EUR: { symbol: '€', gateways: ['flutterwave'] },
  UGX: { symbol: 'USh', gateways: ['flutterwave'] },
  TZS: { symbol: 'TSh', gateways: ['flutterwave'] },
  RWF: { symbol: 'RF', gateways: ['flutterwave'] },
  XAF: { symbol: 'FCFA', gateways: ['flutterwave'] },
  XOF: { symbol: 'CFA', gateways: ['flutterwave'] },
  CAD: { symbol: 'CA$', gateways: ['flutterwave'] },
  AUD: { symbol: 'A$', gateways: ['flutterwave'] },
};

async function settingValue(env: Env, key: string): Promise<string | null> {
  try {
    const { rows } = await getDb(env).query<any>('SELECT value FROM system_settings WHERE key = $1', [key]);
    return rows[0]?.value || null;
  } catch { return null; }
}

async function platformCurrency(env: Env): Promise<string> {
  try {
    const { rows } = await getDb(env).query<{ value: string }>(
      `SELECT value FROM system_settings WHERE key='platform_currency'`
    );
    return (rows[0]?.value || 'NGN').toUpperCase();
  } catch {
    return 'NGN';
  }
}

async function activePromotion(env: Env, courseId: string, category: string | null): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `SELECT p.* FROM promotions p
     LEFT JOIN categories cat ON cat.id = p.category_id
     WHERE p.is_active = true AND p.starts_at <= NOW() AND p.ends_at > NOW()
       AND ((p.scope = 'course' AND p.course_id = $1)
         OR (p.scope = 'category' AND cat.name = $2)
         OR (p.scope = 'all'))
     ORDER BY CASE WHEN p.scope = 'course' THEN 0 WHEN p.scope = 'category' THEN 1 ELSE 2 END,
              p.discount_percent DESC, p.ends_at ASC
     LIMIT 1`,
    [courseId, category]
  );
  return rows[0] || null;
}

function gatewayConfigured(key: string | undefined): boolean {
  return !!key && key.length > 20 && !key.includes('xxxx');
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function hmacHex(secret: string, body: string, hash: 'SHA-512' | 'SHA-256'): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function enrollIfMissing(env: Env, userId: string, courseId: string): Promise<void> {
  const db = getDb(env);
  const existing = await db.query<any>(
    'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
    [userId, courseId]
  );
  if (existing.rows.length) return;
  await db.query(
    `INSERT INTO enrollments (user_id, course_id, status) VALUES ($1, $2, 'active')`,
    [userId, courseId]
  );
  const course = await db.query<any>('SELECT title, instructor_id FROM courses WHERE id = $1', [courseId]);
  if (course.rows[0]) {
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, 'New Enrollment', $2, 'enrollment', $3)`,
      [course.rows[0].instructor_id, `A student enrolled in "${course.rows[0].title}" (paid)`, '/instructor/students']
    );
  }
}

async function sendReceipt(env: Env, payment: any, itemTitle: string): Promise<void> {
  try {
    const db = getDb(env);
    const user = (await db.query<any>('SELECT name, email FROM users WHERE id = $1', [payment.user_id])).rows[0];
    if (!user?.email) return;
    const date = new Date(payment.created_at || Date.now()).toISOString().slice(0, 10);
    const amount = `${payment.currency || 'NGN'} ${Number(payment.amount || 0).toFixed(2)}`;
    const pdf = receiptPdf({
      reference: payment.reference,
      date,
      customer: user.name || 'Student',
      email: user.email,
      item: itemTitle,
      amount,
      method: payment.provider || 'online',
      status: 'Paid',
    });
    if (env.R2) {
      await env.R2.put(`receipts/${payment.reference}.pdf`, pdf, {
        httpMetadata: { contentType: 'application/pdf' },
      }).catch(() => {});
    }
    await mail.invoice(env, user.email, user.name, {
      reference: payment.reference,
      amount,
      course: itemTitle,
      date,
    }, pdf.slice().buffer as ArrayBuffer);
  } catch (e: any) {
    console.log(JSON.stringify({ src: 'receipt', error: e?.message }));
  }
}

async function verifyPaymentByReference(env: Env, reference: string) {
  const db = getDb(env);
  const { rows } = await db.query<any>('SELECT * FROM payments WHERE reference = $1', [reference]);
  const payment = rows[0];
  if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404 });
  const wasPending = payment.status === 'pending';

  if (payment.status === 'pending') {
    const paystackKey = env.PAYSTACK_SECRET_KEY || '';
    const flutterwaveKey = env.FLUTTERWAVE_SECRET_KEY || '';
    let verified = false;

    if (payment.provider === 'paystack' && gatewayConfigured(paystackKey)) {
      try {
        const resp = await fetchWithTimeout(`https://api.paystack.co/transaction/verify/${reference}`, {
          headers: { Authorization: `Bearer ${paystackKey}` },
        });
        const data: any = await resp.json();
        if (data.status && data.data?.status === 'success') verified = true;
      } catch { /* fall through */ }
    } else if (payment.provider === 'flutterwave' && gatewayConfigured(flutterwaveKey)) {
      try {
        const resp = await fetchWithTimeout(`https://api.flutterwave.com/v3/transactions/${reference}/verify`, {
          headers: { Authorization: `Bearer ${flutterwaveKey}` },
        });
        const data: any = await resp.json();
        if (data.status === 'success' && data.data?.status === 'successful') verified = true;
      } catch { /* fall through */ }
    } else {
      // No gateway configured (dev/test): trust the reference.
      verified = true;
    }

    if (verified) {
      await db.query(
        'UPDATE payments SET status = $1, metadata = $2 WHERE reference = $3',
        ['completed', JSON.stringify({ verified: true }), reference]
      );
      if (payment.discount_code_id) {
        await markDiscountCodeUsed(env, payment.discount_code_id, payment.id);
      }
      if (payment.course_id) await enrollIfMissing(env, payment.user_id, payment.course_id);
      else await enrollBundleCourses(env, payment);
    }
  }

  const updated = await db.query<any>('SELECT * FROM payments WHERE reference = $1', [reference]);
  const fresh = updated.rows[0];
  if (wasPending && fresh?.status === 'completed') {
    let title = 'Course enrollment';
    if (fresh.course_id) {
      const course = await db.query<any>('SELECT title FROM courses WHERE id = $1', [fresh.course_id]);
      title = course.rows[0]?.title || title;
    } else {
      try {
        const meta = JSON.parse(fresh.metadata || '{}');
        title = meta.pathTitle ? `Learning path: ${meta.pathTitle}` : 'Learning path bundle';
      } catch { title = 'Learning path bundle'; }
    }
    await sendReceipt(env, fresh, title);
  }
  return fresh;
}

async function courseSlug(env: Env, courseId: string | null): Promise<string | null> {
  if (!courseId) return null;
  const { rows } = await getDb(env).query<any>('SELECT slug FROM courses WHERE id = $1', [courseId]);
  return rows[0]?.slug || null;
}

// POST /api/v1/payments/initialize
payments.post('/initialize', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!(await isEnabled(c.env, 'paid_enrollment_enabled'))) return fail(c, 403, 'Paid enrolment is currently disabled');
    const { courseId, provider, discountCode, pathId } = body;
    let currency = body.currency ? String(body.currency).toUpperCase() : await platformCurrency(c.env);

    // Learning-path bundle checkout: one payment, many courses.
    if (pathId) {
      const path = (await getDb(c.env).query<any>('SELECT * FROM learning_paths WHERE id = $1 OR slug = $1', [pathId])).rows[0];
      if (!path) return fail(c, 404, 'Learning path not found');
      const bundle = await initializeBundlePayment(c.env, s.userId, path, body);
      return c.json({ success: true, data: bundle });
    }

    if (!courseId) return fail(c, 400, 'courseId is required');
    if (!['paystack', 'flutterwave'].includes(provider)) return fail(c, 400, 'provider must be paystack or flutterwave');

    const info = CURRENCIES[currency];
    if (!info) return fail(c, 400, `Unsupported currency ${currency}. Supported: ${Object.keys(CURRENCIES).join(', ')}`);
    if (!info.gateways.includes(provider)) {
      return fail(c, 400, `${provider} does not support ${currency}. Supported: ${info.gateways.join(', ')}`);
    }

    const db = getDb(c.env);
    const userRes = await db.query<any>('SELECT * FROM users WHERE id = $1', [s.userId]);
    const user = userRes.rows[0];
    if (!user) return fail(c, 404, 'User not found');
    const courseRes = await db.query<any>('SELECT * FROM courses WHERE id = $1', [courseId]);
    const course = courseRes.rows[0];
    if (!course) return fail(c, 404, 'Course not found');

    const promotion = await activePromotion(c.env, courseId, course.category ?? null);
    const promoPercent = promotion ? Number(promotion.discount_percent) : 0;
    const promoAmount = promoPercent > 0 ? Number((Number(course.price) * promoPercent / 100).toFixed(2)) : 0;
    const priceAfterPromotion = Number(course.price) * (1 - promoPercent / 100);

    let xpDiscount = 0;
    let discountRow: any = null;
    if (discountCode) {
      const validation = await validateDiscountCode(c.env, discountCode, s.userId, priceAfterPromotion);
      if (!validation.valid) return fail(c, 400, validation.reason || 'Invalid discount code');
      xpDiscount = validation.discount;
      discountRow = validation.row;
    }
    const effectivePrice = Math.max(0, priceAfterPromotion - xpDiscount);

    if (effectivePrice <= 0) {
      await enrollIfMissing(c.env, s.userId, courseId);
      if (discountRow) await markDiscountCodeUsed(c.env, discountRow.id, undefined);
      return c.json({
        success: true,
        data: {
          amount: 0,
          course_slug: course.slug,
          message: discountRow
            ? `Enrolled successfully (XP discount ${info.symbol}${xpDiscount} applied)`
            : 'Enrolled successfully (100% promotional discount applied)',
        },
      });
    }

    if (Number(course.price) === 0) return fail(c, 400, 'This course is free. No payment required.');

    const existing = await db.query<any>(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [s.userId, courseId]
    );
    if (existing.rows.length) {
      // Idempotent: the UI can safely call initialize for a course the user
      // already owns (e.g. after a free promo or an admin enrollment).
      return c.json({
        success: true,
        data: { alreadyEnrolled: true, amount: 0, course_slug: course.slug, message: 'Already enrolled' },
      });
    }

    const reference = `${provider}_${s.userId}_${courseId}_${Date.now()}`;
    const { rows: payRows } = await db.query<any>(
      `INSERT INTO payments (user_id, course_id, amount, currency, provider, reference, discount_code_id, xp_discount, amount_before_discount, promotion_id, promotion_title, promo_discount_percent, promo_discount_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        s.userId, courseId, effectivePrice, currency, provider, reference,
        discountRow?.id || null, xpDiscount, priceAfterPromotion,
        promotion?.id || null, promotion?.title || null,
        promoPercent || null, promoAmount || null,
      ]
    );
    const payment = payRows[0];
    await db.query(
      `INSERT OR IGNORE INTO payment_courses (payment_id, course_id, amount, instructor_id, commission_rate)
       VALUES ($1, $2, $3, (SELECT instructor_id FROM courses WHERE id = $2), NULL)`,
      [payment.id, courseId, effectivePrice]
    );

    const data: any = {
      paymentId: payment.id,
      reference: payment.reference,
      amount: payment.amount,
      currency: payment.currency,
      course_slug: course.slug,
      promotion: promoPercent > 0
        ? {
            id: promotion.id,
            title: promotion.title,
            discount_percent: promoPercent,
            discount_amount: promoAmount,
            price_after_promotion: priceAfterPromotion,
          }
        : null,
    };

    const paystackKey = c.env.PAYSTACK_SECRET_KEY || '';
    const flutterwaveKey = c.env.FLUTTERWAVE_SECRET_KEY || '';

    if (provider === 'paystack' && gatewayConfigured(paystackKey)) {
      const resp = await fetchWithTimeout('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${paystackKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          amount: Math.round(Number(payment.amount) * 100),
          reference: payment.reference,
          currency: payment.currency,
          callback_url: `${c.env.FRONTEND_URL}/verify-payment`,
          metadata: { userId: s.userId, courseId },
        }),
      });
      const json: any = await resp.json();
      if (!json.status) return fail(c, 502, json.message || 'Paystack initialization failed');
      data.authorizationUrl = json.data.authorization_url;
      data.publicKey = c.env.PAYSTACK_PUBLIC_KEY || await settingValue(c.env, 'paystack_public_key');
    } else if (provider === 'flutterwave' && gatewayConfigured(flutterwaveKey)) {
      const resp = await fetchWithTimeout('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${flutterwaveKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_ref: payment.reference,
          amount: Number(payment.amount),
          currency: payment.currency,
          redirect_url: `${c.env.FRONTEND_URL}/verify-payment?reference=${payment.reference}`,
          customer: { email: user.email, name: user.name },
          meta: { userId: s.userId, courseId },
          customizations: { title: 'CareerCode Academy', description: course.title },
        }),
      });
      const json: any = await resp.json();
      if (json.status === 'success' || json.status === '1') {
        data.authorizationUrl = json.data?.link;
        data.publicKey = c.env.FLUTTERWAVE_PUBLIC_KEY || await settingValue(c.env, 'flutterwave_public_key');
        data.provider = 'flutterwave';
      } else {
        return fail(c, 502, json.message || 'Flutterwave initialization failed');
      }
    } else {
      // No gateway keys: dev mode — hand back a success URL so enrollment can be completed.
      data.authorizationUrl = `${c.env.FRONTEND_URL}/verify-payment?reference=${payment.reference}&status=success`;
      data.publicKey = c.env.PAYSTACK_PUBLIC_KEY || await settingValue(c.env, 'paystack_public_key') || '';
    }

    return c.json({ success: true, data });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to initialize payment');
  }
});

// GET /api/v1/payments/verify/:reference
payments.get('/verify/:reference', async (c) => {
  try {
    const s = await requireAuth(c);
    const reference = c.req.param('reference');
    const db = getDb(c.env);
    const { rows } = await db.query<any>('SELECT * FROM payments WHERE reference = $1', [reference]);
    if (!rows.length) return fail(c, 404, 'Payment not found');
    if (rows[0].user_id !== s.userId && !['admin', 'super_admin'].includes(s.role)) return fail(c, 403, 'Forbidden');

    const updated = await verifyPaymentByReference(c.env, reference);
    return c.json({ success: true, data: { ...updated, course_slug: await courseSlug(c.env, updated.course_id) }, enrollment: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to verify payment');
  }
});

// POST /api/v1/payments/verify
payments.post('/verify', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!body.reference) return fail(c, 400, 'Reference is required');
    const db = getDb(c.env);
    const { rows } = await db.query<any>('SELECT * FROM payments WHERE reference = $1', [body.reference]);
    if (!rows.length) return fail(c, 404, 'Payment not found');
    if (rows[0].user_id !== s.userId && !['admin', 'super_admin'].includes(s.role)) return fail(c, 403, 'Forbidden');

    const updated = await verifyPaymentByReference(c.env, body.reference);
    return c.json({ success: true, data: { ...updated, course_slug: await courseSlug(c.env, updated.course_id) }, enrollment: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to verify payment');
  }
});

// POST /api/v1/payments/webhook (Paystack / Flutterwave)
payments.post('/webhook', async (c) => {
  try {
    const raw = await c.req.text();
    const paystackSig = c.req.header('x-paystack-signature');
    const flutterwaveSig = c.req.header('verif-hash');

    if (paystackSig) {
      const secret = c.env.PAYSTACK_SECRET_KEY;
      if (!secret) return fail(c, 401, 'Webhook not configured');
      const expected = await hmacHex(secret, raw, 'SHA-512');
      if (expected !== paystackSig) return fail(c, 401, 'Invalid webhook signature');
    } else if (flutterwaveSig) {
      const secret = c.env.FLUTTERWAVE_SECRET_KEY;
      if (!secret) return fail(c, 401, 'Webhook not configured');
      const expected = await hmacHex(secret, raw, 'SHA-256');
      if (expected !== flutterwaveSig) return fail(c, 401, 'Invalid webhook signature');
    }

    const payload = JSON.parse(raw || '{}');
    const data = payload.data || payload;
    const reference = data.reference || data.txRef || data.tx_ref;
    const status = data.status || payload.data?.status;
    if (!reference || !status) return fail(c, 400, 'Missing reference or status');

    const db = getDb(c.env);
    const { rows } = await db.query<any>('SELECT * FROM payments WHERE reference = $1', [reference]);
    const payment = rows[0];
    if (!payment) return fail(c, 404, 'Payment not found');

    const finalStatus = ['success', 'completed', 'successful'].includes(String(status)) ? 'completed' : 'failed';
    let priorMeta: any = {};
    try { priorMeta = JSON.parse(payment.metadata || '{}'); } catch { /* ignore */ }
    const mergedMeta = JSON.stringify({ ...priorMeta, webhook: raw });
    await db.query(
      'UPDATE payments SET status = $1, metadata = $2 WHERE reference = $3',
      [finalStatus, mergedMeta, reference]
    );

    if (finalStatus === 'completed') {
      if (payment.discount_code_id) await markDiscountCodeUsed(c.env, payment.discount_code_id, payment.id);
      if (payment.course_id) await enrollIfMissing(c.env, payment.user_id, payment.course_id);
      else await enrollBundleCourses(c.env, payment);
      if (payment.status !== 'completed') {
        let title = 'Course enrollment';
        if (payment.course_id) {
          const course = await db.query<any>('SELECT title FROM courses WHERE id = $1', [payment.course_id]);
          title = course.rows[0]?.title || title;
        } else if (priorMeta.pathTitle) {
          title = `Learning path: ${priorMeta.pathTitle}`;
        }
        c.executionCtx.waitUntil(sendReceipt(c.env, payment, title));
      }
    }
    return c.json({ success: true });
  } catch {
    return fail(c, 500, 'Webhook processing failed');
  }
});

// POST /api/v1/payments/validate-discount
payments.post('/validate-discount', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!body.code) return fail(c, 400, 'code required');
    let price: number | undefined;
    if (body.pathId) {
      const db = getDb(c.env);
      const path = (await db.query<any>('SELECT * FROM learning_paths WHERE id = $1 OR slug = $1', [body.pathId])).rows[0];
      if (path) {
        const pricing = await LP.getPathPricing(c.env, path, s.userId);
        price = pricing.bundle_price;
      }
    } else if (body.courseId) {
      const db = getDb(c.env);
      const { rows } = await db.query<any>('SELECT * FROM courses WHERE id = $1', [body.courseId]);
      if (rows[0]) {
        const promo = await activePromotion(c.env, body.courseId, rows[0].category ?? null);
        const pct = promo ? Number(promo.discount_percent) : 0;
        price = Number(rows[0].price) * (1 - pct / 100);
      }
    }
    const validation = await validateDiscountCode(c.env, body.code, s.userId, price);
    if (!validation.valid) return fail(c, 400, validation.reason || 'Invalid code');
    return c.json({
      success: true,
      data: {
        discount: validation.discount,
        xpRedeemed: validation.row.xp_redeemed,
        expires_at: validation.row.expires_at,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to validate discount');
  }
});

// GET /api/v1/payments/:reference/receipt
payments.get('/:reference/receipt', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const payment = (await db.query<any>('SELECT * FROM payments WHERE reference = $1', [c.req.param('reference')])).rows[0];
    if (!payment) return fail(c, 404, 'Payment not found');
    if (payment.user_id !== s.userId && !['admin', 'super_admin'].includes(s.role)) return fail(c, 403, 'Forbidden');

    const user = (await db.query<any>('SELECT name, email FROM users WHERE id = $1', [payment.user_id])).rows[0];
    const course = (await db.query<any>('SELECT title FROM courses WHERE id = $1', [payment.course_id])).rows[0];
    const pdf = receiptPdf({
      reference: payment.reference,
      date: new Date(payment.created_at || Date.now()).toISOString().slice(0, 10),
      customer: user?.name || 'Student',
      email: user?.email || '',
      item: course?.title || 'Course enrollment',
      amount: `${payment.currency || 'NGN'} ${Number(payment.amount || 0).toFixed(2)}`,
      method: payment.provider || 'online',
      status: payment.status === 'completed' ? 'Paid' : String(payment.status),
    });
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${payment.reference}.pdf"`,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to build receipt');
  }
});

// GET /api/v1/payments/history
payments.get('/history', async (c) => {
  try {
    const s = await requireAuth(c);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT p.*, c.title as course_title, c.thumbnail as course_thumbnail
       FROM payments p JOIN courses c ON p.course_id = c.id
       WHERE p.user_id = $1 ORDER BY p.created_at DESC`,
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load payment history');
  }
});

export default payments;
