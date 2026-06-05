import { query } from '../config/db';

export interface Thread {
  id: string;
  course_id: string;
  user_id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  created_at: Date;
}

export interface CreateThreadInput {
  course_id: string;
  user_id: string;
  title: string;
  content: string;
}

export interface UpdateThreadInput {
  title?: string;
  content?: string;
  pinned?: boolean;
}

export interface CreateMessageInput {
  thread_id: string;
  user_id: string;
  content: string;
}

// ---- Threads ----

export async function createThread(input: CreateThreadInput): Promise<Thread> {
  const { rows } = await query<Thread>(
    `INSERT INTO forum_threads (course_id, user_id, title, content)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.course_id, input.user_id, input.title, input.content]
  );
  return rows[0];
}

export async function getThreadsByCourse(courseId: string): Promise<Thread[]> {
  const { rows } = await query<Thread>(
    `SELECT t.*, u.name as user_name, u.avatar as user_avatar,
            (SELECT COUNT(*) FROM forum_messages WHERE thread_id = t.id) as message_count
     FROM forum_threads t
     JOIN users u ON t.user_id = u.id
     WHERE t.course_id = $1
     ORDER BY t.pinned DESC, t.created_at DESC`,
    [courseId]
  );
  return rows;
}

export async function getThreadById(id: string): Promise<Thread | null> {
  const { rows } = await query<Thread>(
    `SELECT t.*, u.name as user_name, u.avatar as user_avatar
     FROM forum_threads t
     JOIN users u ON t.user_id = u.id
     WHERE t.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function updateThread(id: string, input: UpdateThreadInput): Promise<Thread | null> {
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

  if (fields.length === 0) return getThreadById(id);

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await query<Thread>(
    `UPDATE forum_threads SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteThread(id: string): Promise<boolean> {
  await query('DELETE FROM forum_messages WHERE thread_id = $1', [id]);
  const { rowCount } = await query('DELETE FROM forum_threads WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

// ---- Messages ----

export async function createMessage(input: CreateMessageInput): Promise<Message> {
  const { rows } = await query<Message>(
    `INSERT INTO forum_messages (thread_id, user_id, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.thread_id, input.user_id, input.content]
  );
  return rows[0];
}

export async function getMessagesByThread(threadId: string): Promise<Message[]> {
  const { rows } = await query<Message>(
    `SELECT m.*, u.name as user_name, u.avatar as user_avatar
     FROM forum_messages m
     JOIN users u ON m.user_id = u.id
     WHERE m.thread_id = $1
     ORDER BY m.created_at ASC`,
    [threadId]
  );
  return rows;
}

export async function getMessageById(id: string): Promise<Message | null> {
  const { rows } = await query<Message>(
    `SELECT m.*, u.name as user_name, u.avatar as user_avatar
     FROM forum_messages m
     JOIN users u ON m.user_id = u.id
     WHERE m.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function deleteMessage(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM forum_messages WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function countThreadsByCourse(courseId: string): Promise<number> {
  const { rows } = await query('SELECT COUNT(*) FROM forum_threads WHERE course_id = $1', [courseId]);
  return parseInt(rows[0].count, 10);
}
