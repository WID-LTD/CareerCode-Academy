import type { Env } from './env';
import { getDb } from './db';
import { validateDiscountCode, markDiscountCodeUsed } from './gamification';
import * as LP from './learning-paths';

// Learning-path bundle checkout: one gateway payment, many course enrolments.
// Per-course allocations are stored in payment_courses so instructor payouts
// remain correct.

export const CURRENCIES: Record<string, { symbol: string; gateways: string[] }> = {
  NGN: { symbol: '₦', gateways: ['paystack', 'flutterwave'] },
  USD: { symbol: '$', gateways: ['paystack', 'flutterwave'] },
  GHS: { symbol: 'GH₵', gateways: ['paystack', 'flutterwave'] },
  KES: { symbol: 'KSh', gateways: ['paystack', 'flutterwave'] },
  ZAR: { symbol: 'R', gateways: ['paystack', 'flutterwave'] },
  GBP: { symbol: '£', gateways: ['flutterwave'] },
  EUR: { symbol: '€', gateways: ['flutterwave'] },
};

function gatewayConfigured(key: string | undefined): boolean {
  return !!key && key.length > 20 && !key.includes('xxxx');
}

async function settingValue(env: Env, key: string): Promise<string | null> {
  try {
    const { rows } = await getDb(env).query<any>('SELECT value FROM system_settings WHERE key = $1', [key]);
    return rows[0]?.value || null;
  } catch { return null; }
}

async function platformCurrency(env: Env): Promise<string> {
  try {
    const { rows } = await getDb(env).query<any>(`SELECT value FROM system_settings WHERE key='platform_currency'`);
    return String(rows[0]?.value || 'NGN').toUpperCase();
  } catch {
    return 'NGN';
  }
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

async function ensureEnrollment(env: Env, userId: string, course: any): Promise<boolean> {
  const db = getDb(env);
  const existing = await db.query<any>('SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2', [userId, course.course_id || course.id]);
  if (existing.rows.length) return false;
  await db.query(
    `INSERT INTO enrollments (user_id, course_id, status) VALUES ($1, $2, 'active')`,
    [userId, course.course_id || course.id]
  );
  if (course.instructor_id) {
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, 'New Enrollment', $2, 'enrollment', '/instructor/students')`,
      [course.instructor_id, `A new student enrolled in "${course.title}" (bundle purchase)`]
    );
  }
  return true;
}

export async function initializeBundlePayment(env: Env, userId: string, path: any, input: any) {
  const db = getDb(env);
  const provider = String(input.provider || '');
  if (!['paystack', 'flutterwave'].includes(provider)) {
    throw Object.assign(new Error('provider must be paystack or flutterwave'), { statusCode: 400 });
  }
  const currency = input.currency ? String(input.currency).toUpperCase() : await platformCurrency(env);
  const info = CURRENCIES[currency];
  if (!info) throw Object.assign(new Error(`Unsupported currency ${currency}`), { statusCode: 400 });
  if (!info.gateways.includes(provider)) {
    throw Object.assign(new Error(`${provider} does not support ${currency}`), { statusCode: 400 });
  }

  const user = (await db.query<any>('SELECT * FROM users WHERE id = $1', [userId])).rows[0];
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const pricing = await LP.getPathPricing(env, path, userId);
  if (!pricing.unpaid_courses) {
    const result = await LP.enrollInPath(env, userId, path, 'force');
    return {
      alreadyEnrolled: true,
      amount: 0,
      message: 'You already own every course in this path',
      enrolledCourseIds: result.enrolledCourseIds,
      path_slug: path.slug,
    };
  }
  if (!pricing.bundle_enabled) {
    throw Object.assign(new Error('Bundle purchasing is disabled for this path'), { statusCode: 400 });
  }

  let amount = pricing.bundle_price;
  let xpDiscount = 0;
  let discountRow: any = null;
  if (input.discountCode) {
    const validation = await validateDiscountCode(env, String(input.discountCode), userId, amount);
    if (!validation.valid) throw Object.assign(new Error(validation.reason || 'Invalid discount code'), { statusCode: 400 });
    xpDiscount = validation.discount;
    discountRow = validation.row;
    amount = Math.max(0, amount - xpDiscount);
  }
  amount = Math.round(amount * 100) / 100;

  if (amount <= 0) {
    const result = await LP.enrollInPath(env, userId, path, 'force');
    if (discountRow) await markDiscountCodeUsed(env, discountRow.id, undefined);
    return {
      amount: 0,
      alreadyEnrolled: true,
      message: discountRow ? 'Enrolled with your XP discount' : 'Enrolled',
      enrolledCourseIds: result.enrolledCourseIds,
      path_slug: path.slug,
    };
  }

  const unpaid = pricing.courses.filter((c: any) => c.price > 0 && !c.owned);
  const reference = `bundle_${provider}_${userId}_${path.id}_${Date.now()}`;
  const metadata = JSON.stringify({
    bundle: true,
    pathId: path.id,
    pathSlug: path.slug,
    pathTitle: path.title,
    courseIds: unpaid.map((c: any) => c.id),
  });

  const { rows: payRows } = await db.query<any>(
    `INSERT INTO payments (user_id, course_id, amount, currency, provider, reference, status, metadata, discount_code_id, xp_discount, amount_before_discount)
     VALUES ($1, NULL, $2, $3, $4, $5, 'pending', $6, $7, $8, $9) RETURNING *`,
    [userId, amount, currency, provider, reference, metadata, discountRow?.id || null, xpDiscount, pricing.bundle_price]
  );
  const payment = payRows[0];

  // Allocate the bundle price across courses in proportion to list price.
  const unpaidTotal = unpaid.reduce((sum: number, c: any) => sum + Number(c.price), 0) || 1;
  let allocated = 0;
  for (let i = 0; i < unpaid.length; i++) {
    const course = unpaid[i];
    const share = i === unpaid.length - 1
      ? Math.round((amount - allocated) * 100) / 100
      : Math.round((amount * (Number(course.price) / unpaidTotal)) * 100) / 100;
    allocated += share;
    await db.query(
      `INSERT INTO payment_courses (payment_id, course_id, amount, instructor_id, commission_rate)
       VALUES ($1, $2, $3, (SELECT instructor_id FROM courses WHERE id = $2), NULL)`,
      [payment.id, course.id, share]
    );
  }

  await db.query(
    `INSERT INTO learning_path_enrollments (user_id, path_id, status) VALUES ($1, $2, 'pending_payment')
     ON CONFLICT (user_id, path_id) DO UPDATE SET status = 'pending_payment'`,
    [userId, path.id]
  );

  const data: any = {
    paymentId: payment.id,
    reference: payment.reference,
    amount,
    currency,
    path_slug: path.slug,
    path_title: path.title,
    courses: unpaid.map((c: any) => ({ id: c.id, title: c.title, slug: c.slug, price: Number(c.price) })),
    savings: pricing.savings,
  };

  const paystackKey = env.PAYSTACK_SECRET_KEY || '';
  const flutterwaveKey = env.FLUTTERWAVE_SECRET_KEY || '';

  if (provider === 'paystack' && gatewayConfigured(paystackKey)) {
    const resp = await fetchWithTimeout('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${paystackKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(amount * 100),
        reference,
        currency,
        callback_url: `${env.FRONTEND_URL}/verify-payment`,
        metadata: { userId, pathId: path.id, courseIds: unpaid.map((c: any) => c.id), bundle: true },
      }),
    });
    const json: any = await resp.json();
    if (!json.status) throw Object.assign(new Error(json.message || 'Paystack initialization failed'), { statusCode: 502 });
    data.authorizationUrl = json.data.authorization_url;
    data.publicKey = env.PAYSTACK_PUBLIC_KEY || await settingValue(env, 'paystack_public_key');
  } else if (provider === 'flutterwave' && gatewayConfigured(flutterwaveKey)) {
    const resp = await fetchWithTimeout('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${flutterwaveKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_ref: reference,
        amount,
        currency,
        redirect_url: `${env.FRONTEND_URL}/verify-payment?reference=${reference}`,
        customer: { email: user.email, name: user.name },
        meta: { userId, pathId: path.id, courseIds: unpaid.map((c: any) => c.id), bundle: true },
        customizations: { title: 'CareerCode Academy', description: path.title },
      }),
    });
    const json: any = await resp.json();
    if (json.status === 'success' || json.status === '1') {
      data.authorizationUrl = json.data?.link;
      data.publicKey = env.FLUTTERWAVE_PUBLIC_KEY || await settingValue(env, 'flutterwave_public_key');
      data.provider = 'flutterwave';
    } else {
      throw Object.assign(new Error(json.message || 'Flutterwave initialization failed'), { statusCode: 502 });
    }
  } else {
    data.authorizationUrl = `${env.FRONTEND_URL}/verify-payment?reference=${reference}&status=success`;
    data.publicKey = env.PAYSTACK_PUBLIC_KEY || await settingValue(env, 'paystack_public_key') || '';
  }

  return data;
}

export async function enrollBundleCourses(env: Env, payment: any): Promise<{ titles: string[]; pathId?: string }> {
  const db = getDb(env);
  let metadata: any = {};
  try { metadata = JSON.parse(payment.metadata || '{}'); } catch { /* ignore */ }

  const { rows } = await db.query<any>(
    `SELECT pc.course_id, pc.amount, c.title, c.instructor_id
     FROM payment_courses pc JOIN courses c ON c.id = pc.course_id
     WHERE pc.payment_id = $1`,
    [payment.id]
  );
  for (const course of rows) {
    await ensureEnrollment(env, payment.user_id, course);
  }

  if (metadata.pathId) {
    await db.query(
      `INSERT INTO learning_path_enrollments (user_id, path_id, status) VALUES ($1, $2, 'active')
       ON CONFLICT (user_id, path_id) DO UPDATE SET status = 'active'`,
      [payment.user_id, metadata.pathId]
    );
    try {
      const path = (await db.query<any>('SELECT * FROM learning_paths WHERE id = $1', [metadata.pathId])).rows[0];
      if (path) {
        const courses = await db.query<any>(
          `SELECT c.id, c.title FROM learning_path_courses lpc JOIN courses c ON c.id = lpc.course_id
           WHERE lpc.path_id = $1 ORDER BY lpc.order_index ASC`,
          [metadata.pathId]
        );
        for (let i = 0; i < courses.rows.length; i++) {
          const c = courses.rows[i];
          const autoKey = `path:${path.id}:course:${c.id}`;
          const exists = await db.query<any>('SELECT id FROM todos WHERE user_id = $1 AND auto_key = $2', [payment.user_id, autoKey]);
          if (exists.rows.length) continue;
          await db.query(
            `INSERT INTO todos (id, user_id, title, notes, priority, category, course_id, path_id, source, auto_key, sort_order)
             VALUES ($1,$2,$3,$4,$5,'study',$6,$7,'path',$8,$9)`,
            [crypto.randomUUID(), payment.user_id, `Work through: ${c.title}`, `Part of the ${path.title} learning path.`, i === 0 ? 'high' : 'medium', c.id, path.id, autoKey, i]
          );
        }
      }
    } catch { /* best effort */ }
  }

  return { titles: rows.map((r: any) => r.title), pathId: metadata.pathId };
}
