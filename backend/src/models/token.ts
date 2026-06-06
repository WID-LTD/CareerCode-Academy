import { query } from '../config/db';

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export async function createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
  const { rows } = await query<RefreshToken>(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, token, expiresAt]
  );
  return rows[0];
}

export async function findRefreshToken(token: string): Promise<RefreshToken | null> {
  const { rows } = await query<RefreshToken>(
    `SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()`,
    [token]
  );
  return rows[0] || null;
}

export async function deleteRefreshToken(token: string): Promise<boolean> {
  const { rowCount } = await query(
    `DELETE FROM refresh_tokens WHERE token = $1`,
    [token]
  );
  return (rowCount ?? 0) > 0;
}

export async function deleteAllRefreshTokensForUser(userId: string): Promise<boolean> {
  const { rowCount } = await query(
    `DELETE FROM refresh_tokens WHERE user_id = $1`,
    [userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function clearExpiredTokens(): Promise<number> {
  const { rowCount } = await query(
    `DELETE FROM refresh_tokens WHERE expires_at <= NOW()`
  );
  return rowCount ?? 0;
}
