import { query } from '../config/db';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'student' | 'instructor' | 'admin';
  avatar: string | null;
  bio: string | null;
  is_verified: boolean;
  verification_token: string | null;
  reset_token: string | null;
  reset_token_expiry: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: 'student' | 'instructor' | 'admin';
  verification_token?: string;
}

export interface UpdateUserInput {
  name?: string;
  avatar?: string;
  bio?: string;
  is_verified?: boolean;
  verification_token?: string | null;
  reset_token?: string | null;
  reset_token_expiry?: Date | null;
  password?: string;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { rows } = await query<User>(
    `INSERT INTO users (name, email, password, role, verification_token)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.name, input.email, input.password, input.role || 'student', input.verification_token || null]
  );
  return rows[0];
}

export async function getAllUsers(limit: number = 50, offset: number = 0): Promise<User[]> {
  const { rows } = await query<User>(
    'SELECT id, name, email, role, avatar, bio, is_verified, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return rows;
}

export async function getUserById(id: string): Promise<User | null> {
  const { rows } = await query<User>(
    'SELECT id, name, email, role, avatar, bio, is_verified, created_at, updated_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { rows } = await query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return rows[0] || null;
}

export async function getUserByVerificationToken(token: string): Promise<User | null> {
  const { rows } = await query<User>(
    'SELECT * FROM users WHERE verification_token = $1',
    [token]
  );
  return rows[0] || null;
}

export async function getUserByResetToken(token: string): Promise<User | null> {
  const { rows } = await query<User>(
    'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
    [token]
  );
  return rows[0] || null;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${snakeKey} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) return getUserById(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await query<User>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}
     RETURNING id, name, email, role, avatar, bio, is_verified, created_at, updated_at`,
    values
  );
  return rows[0] || null;
}

export async function deleteUser(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function countUsers(role?: string): Promise<number> {
  if (role) {
    const { rows } = await query('SELECT COUNT(*) FROM users WHERE role = $1', [role]);
    return parseInt(rows[0].count, 10);
  }
  const { rows } = await query('SELECT COUNT(*) FROM users', []);
  return parseInt(rows[0].count, 10);
}
