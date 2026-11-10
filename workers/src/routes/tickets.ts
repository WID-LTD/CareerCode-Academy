import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, statusOf } from '../route-utils';

// Ported from backend/src/routes/ticket.routes.ts.
// Mounted at /api/v1/tickets (every route requires authentication).

const tickets = new Hono<{ Bindings: Env }>();

// GET /api/v1/tickets — current user's tickets
tickets.get('/', async (c) => {
  try {
    const s = await requireAuth(c);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT t.*, a.name as assigned_name
       FROM support_tickets t
       LEFT JOIN users a ON t.assigned_to = a.id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC`,
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load tickets');
  }
});

// POST /api/v1/tickets — create a ticket
tickets.post('/', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const { subject, description, priority } = body;
    if (!subject || !description) {
      return fail(c, 400, 'Subject and description are required');
    }
    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO support_tickets (user_id, subject, description, priority)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [s.userId, subject, description, priority || 'medium']
    );
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create ticket');
  }
});

export default tickets;
