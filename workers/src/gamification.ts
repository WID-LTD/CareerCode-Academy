import type { Env } from './env';
import { getDb } from './db';

// Gamification primitives shared by the learning routes. Ported from
// backend/src/models/gamification.ts; SQL is unchanged (translated to SQLite
// by the D1 client).

export async function awardXp(env: Env, userId: string, amount: number, source: string, description?: string): Promise<number> {
  const db = getDb(env);
  await db.query(
    'INSERT INTO xp_history (user_id, amount, source, description) VALUES ($1, $2, $3, $4)',
    [userId, amount, source, description || null]
  );
  await db.query(
    `INSERT INTO daily_xp_log (user_id, xp_earned, date) VALUES ($1, $2, CURRENT_DATE)
     ON CONFLICT (user_id, date) DO UPDATE SET xp_earned = daily_xp_log.xp_earned + $2`,
    [userId, amount]
  );
  const { rows } = await db.query<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM xp_history WHERE user_id = $1',
    [userId]
  );
  return Number(rows[0]?.total) || 0;
}

export async function updateStreak(env: Env, userId: string): Promise<{ current: number; best: number }> {
  const db = getDb(env);
  const { rows: userRows } = await db.query<{ best_streak: number }>(
    'SELECT best_streak FROM users WHERE id = $1',
    [userId]
  );
  const prevBest = Number(userRows[0]?.best_streak) || 0;
  const { rows: days } = await db.query<{ day: string }>(
    `SELECT DISTINCT DATE(completed_at) as day FROM lesson_progress
     WHERE user_id = $1 AND completed = true ORDER BY day DESC`,
    [userId]
  );
  if (!days.length) {
    await db.query('UPDATE users SET last_active_date = CURRENT_DATE, updated_at = NOW() WHERE id = $1', [userId]);
    return { current: 0, best: prevBest };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDay = new Date(days[0].day);
  firstDay.setHours(0, 0, 0, 0);
  if (Math.floor((today.getTime() - firstDay.getTime()) / 86400000) > 1) {
    await db.query('UPDATE users SET last_active_date = CURRENT_DATE, updated_at = NOW() WHERE id = $1', [userId]);
    return { current: 0, best: prevBest };
  }
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1].day);
    const curr = new Date(days[i].day);
    if ((prev.getTime() - curr.getTime()) / 86400000 === 1) streak++;
    else break;
  }
  const newBest = Math.max(prevBest, streak);
  await db.query(
    'UPDATE users SET last_active_date = CURRENT_DATE, best_streak = $1, updated_at = NOW() WHERE id = $2',
    [newBest, userId]
  );
  return { current: streak, best: newBest };
}

// ── XP / hearts / discounts (ported from backend models/gamification.ts) ──

async function settingsMap(env: Env, keys: string[]): Promise<Record<string, string>> {
  const { rows } = await getDb(env).query<{ key: string; value: string }>(
    `SELECT key, value FROM system_settings WHERE key IN (${keys.map((_, i) => `$${i + 1}`).join(',')})`,
    keys
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function getPlatformCurrency(env: Env): Promise<{ code: string; symbol: string; locale: string }> {
  try {
    const map = await settingsMap(env, ['platform_currency', 'platform_currency_symbol', 'platform_currency_locale']);
    return {
      code: map['platform_currency'] || 'NGN',
      symbol: map['platform_currency_symbol'] || '₦',
      locale: map['platform_currency_locale'] || 'en-NG',
    };
  } catch {
    return { code: 'NGN', symbol: '₦', locale: 'en-NG' };
  }
}

export async function getXpSettings(env: Env) {
  const map = await settingsMap(env, [
    'xp_to_ngn_rate', 'xp_redeem_enabled', 'xp_min_redeem', 'xp_redeem_step',
    'xp_max_discount_percent', 'xp_code_expiry_days',
  ]);
  return {
    rate: parseFloat(map['xp_to_ngn_rate'] || '0.1'),
    redeemEnabled: (map['xp_redeem_enabled'] || 'true') === 'true',
    minRedeem: parseInt(map['xp_min_redeem'] || '1000', 10),
    step: parseInt(map['xp_redeem_step'] || '1000', 10),
    maxDiscountPercent: parseInt(map['xp_max_discount_percent'] || '50', 10),
    expiryDays: parseInt(map['xp_code_expiry_days'] || '30', 10),
  };
}

export async function getHearts(env: Env, userId: string): Promise<{ hearts: number; maxHearts: number; nextHeartIn: number | null }> {
  const { rows } = await getDb(env).query<any>(
    'SELECT hearts, max_hearts, last_heart_regeneration FROM users WHERE id = $1',
    [userId]
  );
  const user = rows[0];
  if (!user) return { hearts: 0, maxHearts: 5, nextHeartIn: null };
  const hearts = Number(user.hearts);
  const maxHearts = Number(user.max_hearts);
  if (hearts >= maxHearts) return { hearts, maxHearts, nextHeartIn: null };
  const elapsed = Date.now() - new Date(user.last_heart_regeneration).getTime();
  const remaining = 30 * 60 * 1000 - elapsed;
  if (remaining <= 0) return { hearts, maxHearts, nextHeartIn: 0 };
  return { hearts, maxHearts, nextHeartIn: Math.ceil(remaining / 60000) };
}

export async function getDailyProgress(env: Env, userId: string): Promise<{ xpEarned: number; goal: number; goalReached: boolean }> {
  const { rows } = await getDb(env).query<any>(
    `SELECT d.xp_earned, d.goal_reached, u.daily_xp_goal
     FROM daily_xp_log d
     RIGHT JOIN users u ON u.id = d.user_id AND d.date = CURRENT_DATE
     WHERE u.id = $1`,
    [userId]
  );
  const row = rows[0];
  return {
    xpEarned: Number(row?.xp_earned) || 0,
    goal: Number(row?.daily_xp_goal) || 50,
    goalReached: !!row?.goal_reached,
  };
}

export async function setDailyGoal(env: Env, userId: string, goal: number): Promise<void> {
  const clamped = Math.max(10, Math.min(200, goal));
  await getDb(env).query('UPDATE users SET daily_xp_goal = $1, updated_at = NOW() WHERE id = $2', [clamped, userId]);
}

export async function useStreakFreeze(env: Env, userId: string): Promise<boolean> {
  const { rows } = await getDb(env).query<any>(
    `UPDATE users SET streak_freezes = streak_freezes - 1, updated_at = NOW()
     WHERE id = $1 AND streak_freezes > 0 RETURNING streak_freezes`,
    [userId]
  );
  return rows.length > 0;
}

export async function getXpBreakdown(env: Env, userId: string): Promise<{ source: string; amount: number; count: number }[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT source, SUM(amount) as amount, COUNT(*) as count
     FROM xp_history WHERE user_id = $1 GROUP BY source ORDER BY amount DESC`,
    [userId]
  );
  return rows.map((r) => ({ source: r.source, amount: Number(r.amount), count: Number(r.count) }));
}

export async function getSkillTree(env: Env, userId: string, courseId: string): Promise<any[]> {
  const db = getDb(env);
  const { rows: modules } = await db.query<any>(
    'SELECT m.id, m.title, m.order_index FROM modules m WHERE m.course_id = $1 ORDER BY m.order_index',
    [courseId]
  );
  for (const mod of modules) {
    const { rows: lessons } = await db.query<any>(
      `SELECT l.id, l.title, l.order_index, l.is_free, l.duration,
              lp.completed, lp.completed_at, lp.watch_percentage
       FROM lessons l
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $1
       WHERE l.module_id = $2 ORDER BY l.order_index`,
      [userId, mod.id]
    );
    mod.lessons = lessons.map((l) => ({ ...l, xpLevel: l.completed ? 'bronze' : 'none' }));
    const completed = lessons.filter((l) => l.completed).length;
    mod.completed = completed;
    mod.total = lessons.length;
    mod.percentage = lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;
  }
  return modules;
}

export async function getXpBalance(env: Env, userId: string) {
  const settings = await getXpSettings(env);
  const currency = await getPlatformCurrency(env);
  const db = getDb(env);
  const earned = await db.query<any>('SELECT COALESCE(SUM(amount),0)::int as total FROM xp_history WHERE user_id = $1', [userId]);
  const redeemed = await db.query<any>('SELECT COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END),0)::int as redeemed FROM xp_history WHERE user_id = $1', [userId]);
  const netRes = await db.query<any>('SELECT COALESCE(SUM(amount),0)::int as net FROM xp_history WHERE user_id = $1', [userId]);
  const totalEarned = Number(earned.rows[0]?.total) || 0;
  const net = Number(netRes.rows[0]?.net) || 0;
  const totalRedeemed = Number(redeemed.rows[0]?.redeemed) || 0;
  const available = Math.max(0, net);
  const totalPositive = totalEarned > 0 ? totalEarned : available + totalRedeemed;
  return {
    totalEarned: totalPositive,
    totalRedeemed,
    available,
    rate: settings.rate,
    ngnValue: Math.floor(available * settings.rate),
    minRedeem: settings.minRedeem,
    step: settings.step,
    maxDiscountPercent: settings.maxDiscountPercent,
    redeemEnabled: settings.redeemEnabled,
    currency: currency.code,
    currencySymbol: currency.symbol,
  };
}

export async function redeemXpForDiscount(env: Env, userId: string, xpAmount: number) {
  const settings = await getXpSettings(env);
  if (!settings.redeemEnabled) throw new Error('XP redemption is disabled');
  if (!Number.isInteger(xpAmount) || xpAmount < settings.minRedeem) throw new Error(`Minimum redeem is ${settings.minRedeem} XP`);
  if (xpAmount % settings.step !== 0) throw new Error(`XP amount must be in steps of ${settings.step}`);
  const balance = await getXpBalance(env, userId);
  if (balance.available < xpAmount) throw new Error(`Insufficient XP. Available: ${balance.available}`);

  const discountAmount = Math.floor(xpAmount * settings.rate);
  if (discountAmount <= 0) throw new Error('Discount amount must be greater than 0');

  const currency = await getPlatformCurrency(env);
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const code = 'XP-' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const expiresAt = new Date(Date.now() + settings.expiryDays * 86400000).toISOString();
  const db = getDb(env);

  const { rows } = await db.query<any>(
    `INSERT INTO discount_codes (code, user_id, xp_redeemed, discount_amount, currency, status, expires_at)
     VALUES ($1,$2,$3,$4,$5,'active',$6) RETURNING *`,
    [code, userId, xpAmount, discountAmount, currency.code, expiresAt]
  );
  await db.query(
    `INSERT INTO xp_history (user_id, amount, source, description) VALUES ($1,$2,'redeem',$3)`,
    [userId, -xpAmount, `Redeemed ${xpAmount} XP for ${code} (${currency.symbol}${discountAmount})`]
  );
  return rows[0];
}

export async function validateDiscountCode(env: Env, code: string, userId: string, coursePrice?: number) {
  const normalized = code.trim().toUpperCase();
  const db = getDb(env);
  const { rows } = await db.query<any>('SELECT * FROM discount_codes WHERE code = $1', [normalized]);
  if (!rows.length) return { valid: false, discount: 0, reason: 'Invalid code' };
  const row = rows[0];
  if (row.user_id !== userId) return { valid: false, discount: 0, reason: 'Code does not belong to you' };
  if (row.status !== 'active') {
    return { valid: false, discount: 0, reason: row.status === 'used' ? 'Code already used' : `Code ${row.status}` };
  }
  if (new Date(row.expires_at) < new Date()) {
    await db.query(`UPDATE discount_codes SET status='expired' WHERE id=$1`, [row.id]);
    return { valid: false, discount: 0, reason: 'Code expired' };
  }
  if (coursePrice !== undefined) {
    const settings = await getXpSettings(env);
    const currency = await getPlatformCurrency(env);
    const maxDiscount = Math.floor(coursePrice * (settings.maxDiscountPercent / 100));
    if (Number(row.discount_amount) > maxDiscount) {
      return { valid: false, discount: 0, reason: `Discount exceeds ${settings.maxDiscountPercent}% cap (${currency.symbol}${maxDiscount} max)` };
    }
  }
  return { valid: true, discount: Number(row.discount_amount), row };
}

export async function getUserDiscountCodes(env: Env, userId: string) {
  const { rows } = await getDb(env).query<any>(
    'SELECT * FROM discount_codes WHERE user_id=$1 ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}
