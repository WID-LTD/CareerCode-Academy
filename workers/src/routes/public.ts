import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';

const pub = new Hono<{ Bindings: Env }>();

// GET /api/v1/public/stats — real platform counts (same shape as Express)
pub.get('/stats', async (c) => {
  const count = async (sql: string): Promise<number> => {
    try {
      const { rows } = await getDb(c.env).query<{ n: number }>(sql);
      return Number(rows[0]?.n) || 0;
    } catch {
      return 0;
    }
  };
  const [students, courses, certificates, alumni] = await Promise.all([
    count(`SELECT COUNT(*)::int AS n FROM users WHERE role = 'student'`),
    count(`SELECT COUNT(*)::int AS n FROM courses WHERE published = true`),
    count(`SELECT COUNT(*)::int AS n FROM certificates`),
    count(`SELECT COUNT(*)::int AS n FROM alumni`),
  ]);
  return c.json({ success: true, data: { students, courses, certificates, alumni } });
});

// GET /api/v1/public/currency — platform currency for checkout/pricing
pub.get('/currency', async (c) => {
  try {
    const { rows } = await getDb(c.env).query<any>(
      `SELECT key, value FROM system_settings WHERE key IN ('platform_currency','platform_currency_symbol','platform_currency_locale')`
    );
    const map: Record<string, string> = {};
    rows.forEach((r: any) => { map[r.key] = r.value; });
    return c.json({
      success: true,
      data: {
        code: map['platform_currency'] || 'NGN',
        symbol: map['platform_currency_symbol'] || '₦',
        locale: map['platform_currency_locale'] || 'en-NG',
      },
    });
  } catch {
    return c.json({ success: true, data: { code: 'NGN', symbol: '₦', locale: 'en-NG' } });
  }
});

export default pub;
