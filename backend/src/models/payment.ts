import { query } from '../config/db';

export interface Payment {
  id: string;
  user_id: string;
  course_id: string;
  amount: number;
  currency: string;
  provider: string;
  reference: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  metadata: any;
  created_at: Date;
}

export interface CreatePaymentInput {
  user_id: string;
  course_id: string;
  amount: number;
  currency?: string;
  provider: string;
  reference: string;
}

export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  const { rows } = await query<Payment>(
    `INSERT INTO payments (user_id, course_id, amount, currency, provider, reference)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.user_id, input.course_id, input.amount, input.currency || 'NGN', input.provider, input.reference]
  );
  return rows[0];
}

export async function getPaymentByReference(reference: string): Promise<Payment | null> {
  const { rows } = await query<Payment>('SELECT * FROM payments WHERE reference = $1', [reference]);
  return rows[0] || null;
}

export async function updatePaymentStatus(reference: string, status: Payment['status'], metadata?: any): Promise<Payment | null> {
  const { rows } = await query<Payment>(
    `UPDATE payments SET status = $1, metadata = $2 WHERE reference = $3 RETURNING *`,
    [status, metadata ? JSON.stringify(metadata) : null, reference]
  );
  return rows[0] || null;
}

export async function getPaymentsByUser(userId: string): Promise<Payment[]> {
  const { rows } = await query<Payment>(
    `SELECT p.*, c.title as course_title, c.thumbnail as course_thumbnail
     FROM payments p
     JOIN courses c ON p.course_id = c.id
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getAllPayments(limit: number = 50, offset: number = 0): Promise<Payment[]> {
  const { rows } = await query<Payment>(
    `SELECT p.*, u.name as user_name, u.email as user_email, c.title as course_title
     FROM payments p
     JOIN users u ON p.user_id = u.id
     JOIN courses c ON p.course_id = c.id
     ORDER BY p.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const { rows } = await query<Payment>('SELECT * FROM payments WHERE id = $1', [id]);
  return rows[0] || null;
}
