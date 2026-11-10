import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, requireRole, statusOf } from '../route-utils';
import * as Community from '../community';
import { mail } from '../email';

// Community domain, ported from backend/src/routes/community.routes.ts.
// Mount at /api/v1/community.
//
// Socket.IO broadcasts are dropped (no realtime on the Worker) and multer
// uploads are replaced by attachment_* URLs accepted in the JSON body.

const community = new Hono<{ Bindings: Env }>();

// ── helpers ────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: any): boolean {
  return typeof value === 'string' && UUID_RE.test(value);
}

function validationError(c: any, errors: Record<string, string[]>) {
  return c.json({ success: false, message: 'Validation failed', errors }, 400 as any);
}

function isUniqueViolation(e: any): boolean {
  return e?.code === '23505' || /UNIQUE constraint failed/i.test(String(e?.message || ''));
}

async function body(c: any): Promise<any> {
  return await c.req.json().catch(() => ({}));
}

async function notify(env: Env, input: { user_id: string; title: string; message: string; type?: string }) {
  await getDb(env).query(
    `INSERT INTO notifications (user_id, title, message, type)
     VALUES ($1, $2, $3, $4)`,
    [input.user_id, input.title, input.message, input.type || 'info']
  );
}

// Helper: check community role (global admins bypass)
async function requireCommunityRole(
  c: any,
  communityId: string,
  userId: string,
  allowedRoles: string[],
  userRole?: string
): Promise<any> {
  if (userRole && ['admin', 'super_admin'].includes(userRole)) return null;
  const member = await Community.isCommunityMember(c.env, communityId, userId);
  if (!member) {
    throw Object.assign(new Error('You are not a member of this community'), { statusCode: 403 });
  }
  if (!allowedRoles.includes(member.role)) {
    throw Object.assign(new Error('Insufficient permissions'), { statusCode: 403 });
  }
  return member;
}

// ── Categories ─────────────────────────────────────────────────────────────

// GET /api/v1/community/categories
community.get('/categories', async (c) => {
  try {
    const categories = await Community.getCategories(c.env);
    return c.json({ success: true, data: categories });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load categories');
  }
});

// ── Channels ───────────────────────────────────────────────────────────────

// GET /api/v1/community/channels
community.get('/channels', async (c) => {
  try {
    const s = await requireAuth(c);
    const channels = await Community.getChannels(c.env, s.userId);
    return c.json({ success: true, data: channels });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load channels');
  }
});

// POST /api/v1/community/channels
community.post('/channels', async (c) => {
  try {
    const s = await requireAuth(c);
    const input = await body(c);
    const errors: Record<string, string[]> = {};
    if (typeof input.name !== 'string' || input.name.length < 1 || input.name.length > 100) {
      errors.name = ['String must contain at least 1 character(s)'];
    }
    if (typeof input.slug !== 'string' || input.slug.length < 1 || input.slug.length > 150) {
      errors.slug = ['String must contain at least 1 character(s)'];
    } else if (!/^[a-z0-9-]+$/.test(input.slug)) {
      errors.slug = ['Slug must be lowercase alphanumeric with hyphens'];
    }
    if (input.description !== undefined && (typeof input.description !== 'string' || input.description.length > 500)) {
      errors.description = ['String must contain at most 500 character(s)'];
    }
    if (input.category_id !== undefined && !isUuid(input.category_id)) {
      errors.category_id = ['Invalid uuid'];
    }
    if (input.type !== undefined && !['text', 'announcement', 'project_showcase'].includes(input.type)) {
      errors.type = ['Invalid enum value'];
    }
    if (input.course_id !== undefined && !isUuid(input.course_id)) errors.course_id = ['Invalid uuid'];
    if (input.lesson_id !== undefined && !isUuid(input.lesson_id)) errors.lesson_id = ['Invalid uuid'];
    if (Object.keys(errors).length) return validationError(c, errors);

    const channel = await Community.createChannel(c.env, {
      ...input,
      created_by: s.userId,
    });
    return c.json({ success: true, data: channel }, 201);
  } catch (e: any) {
    if (isUniqueViolation(e)) {
      return fail(c, 409, 'A channel with that slug already exists in this category');
    }
    return fail(c, statusOf(e), e?.message || 'Failed to create channel');
  }
});

// GET /api/v1/community/channels/:id
community.get('/channels/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const channel = await Community.getChannelById(c.env, c.req.param('id'));
    if (!channel) return fail(c, 404, 'Channel not found');

    const member = await Community.isChannelMember(c.env, channel.id, s.userId);
    const stats = await Community.getChannelStats(c.env, channel.id);

    return c.json({
      success: true,
      data: { ...channel, ...stats, is_member: !!member, my_role: member?.role },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load channel');
  }
});

// PUT /api/v1/community/channels/:id
community.put('/channels/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    // Admin/super_admin can rename any channel
    if (!['admin', 'super_admin'].includes(s.role)) {
      const member = await Community.isChannelMember(c.env, c.req.param('id'), s.userId);
      if (!member || !['owner', 'moderator'].includes(member.role)) {
        return fail(c, 403, 'Only channel owners and moderators can edit channels');
      }
    }

    const channel = await Community.updateChannel(c.env, c.req.param('id'), await body(c));
    if (!channel) return fail(c, 404, 'Channel not found');
    return c.json({ success: true, data: channel });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update channel');
  }
});

// DELETE /api/v1/community/channels/:id
community.delete('/channels/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const member = await Community.isChannelMember(c.env, c.req.param('id'), s.userId);
    if (!member || member.role !== 'owner') {
      if (!['admin', 'super_admin'].includes(s.role)) {
        return fail(c, 403, 'Only channel owners or admins can delete channels');
      }
    }

    const deleted = await Community.deleteChannel(c.env, c.req.param('id'));
    if (!deleted) return fail(c, 404, 'Channel not found');
    return c.json({ success: true, message: 'Channel deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete channel');
  }
});

// ── Join / Leave ───────────────────────────────────────────────────────────

// POST /api/v1/community/channels/:id/join
community.post('/channels/:id/join', async (c) => {
  try {
    const s = await requireAuth(c);
    const channelId = c.req.param('id');
    const channel = await Community.getChannelById(c.env, channelId);
    if (!channel) return fail(c, 404, 'Channel not found');

    const existing = await Community.isChannelMember(c.env, channelId, s.userId);
    if (existing) {
      return c.json({ success: true, message: 'Already a member', data: existing });
    }

    const member = await Community.joinChannel(c.env, channelId, s.userId);

    // Update member_count
    await getDb(c.env).query(
      'UPDATE community_channels SET member_count = member_count + 1 WHERE id = $1',
      [channelId]
    );

    return c.json({ success: true, data: member });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to join channel');
  }
});

// POST /api/v1/community/channels/:id/leave
community.post('/channels/:id/leave', async (c) => {
  try {
    const s = await requireAuth(c);
    const channelId = c.req.param('id');
    const left = await Community.leaveChannel(c.env, channelId, s.userId);
    if (left) {
      await getDb(c.env).query(
        'UPDATE community_channels SET member_count = CASE WHEN member_count > 0 THEN member_count - 1 ELSE 0 END WHERE id = $1',
        [channelId]
      );
    }
    return c.json({ success: true, message: 'Left channel' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to leave channel');
  }
});

// ── Members ────────────────────────────────────────────────────────────────

// GET /api/v1/community/channels/:id/members
community.get('/channels/:id/members', async (c) => {
  try {
    const s = await requireAuth(c);
    const member = await Community.isChannelMember(c.env, c.req.param('id'), s.userId);
    if (!member) return fail(c, 403, 'You must be a member to view members');

    const members = await Community.getChannelMembers(c.env, c.req.param('id'));
    return c.json({ success: true, data: members });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load members');
  }
});

// ── Messages ───────────────────────────────────────────────────────────────

// GET /api/v1/community/channels/:id/messages
community.get('/channels/:id/messages', async (c) => {
  try {
    const s = await requireAuth(c);
    const channelId = c.req.param('id');
    const member = await Community.isChannelMember(c.env, channelId, s.userId);
    if (!member) return fail(c, 403, 'You must be a member to view messages');

    const limit = Math.min(parseInt(c.req.query('limit') || '') || 50, 100);
    const before = c.req.query('before') || undefined;

    const messages = await Community.getChannelMessages(c.env, channelId, limit, before);

    // Mark as read
    await Community.updateLastRead(c.env, channelId, s.userId);

    return c.json({ success: true, data: messages });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load messages');
  }
});

// POST /api/v1/community/channels/:id/messages
community.post('/channels/:id/messages', async (c) => {
  try {
    const s = await requireAuth(c);
    const channelId = c.req.param('id');
    const member = await Community.isChannelMember(c.env, channelId, s.userId);
    if (!member) return fail(c, 403, 'You must be a member to send messages');
    if (member.is_muted) return fail(c, 403, 'You are muted in this channel');

    const input = await body(c);
    const rawContent = input.content;
    if (typeof rawContent !== 'string' || rawContent.length < 1 || rawContent.length > 5000) {
      return validationError(c, { content: ['String must contain at least 1 character(s)'] });
    }
    const content = rawContent;
    if (!content || !content.trim()) {
      return fail(c, 401, 'Message content is required');
    }

    // Uploads are not handled on the Worker: accept already-hosted URLs.
    const message = await Community.createMessage(c.env, {
      channel_id: channelId,
      author_id: s.userId,
      content: content.trim(),
      attachment_url: input.attachment_url,
      attachment_type: input.attachment_type,
      attachment_name: input.attachment_name,
    });

    // Notify mentioned users (@username -> username@careercode.com)
    const mentions = content.match(/@(\w+)/g);
    if (mentions) {
      const channel = await Community.getChannelById(c.env, channelId);
      for (const mention of mentions) {
        const username = mention.slice(1);
        const { rows } = await getDb(c.env).query<any>(
          'SELECT id FROM users WHERE email = $1',
          [`${username}@careercode.com`]
        );
        const mentionedUser = rows[0];
        if (mentionedUser) {
          await notify(c.env, {
            user_id: mentionedUser.id,
            title: 'You were mentioned',
            message: `You were mentioned in #${channel?.name || 'channel'}`,
            type: 'info',
          });
        }
      }
    }

    return c.json({ success: true, data: message }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to send message');
  }
});

// PUT /api/v1/community/channels/:channelId/messages/:msgId
community.put('/channels/:channelId/messages/:msgId', async (c) => {
  try {
    const s = await requireAuth(c);
    const input = await body(c);
    if (typeof input.content !== 'string' || input.content.length < 1 || input.content.length > 5000) {
      return validationError(c, { content: ['String must contain at least 1 character(s)'] });
    }

    const message = await Community.editMessage(c.env, c.req.param('msgId'), s.userId, input.content);
    if (!message) return fail(c, 404, 'Message not found');
    return c.json({ success: true, data: message });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to edit message');
  }
});

// DELETE /api/v1/community/channels/:channelId/messages/:msgId
community.delete('/channels/:channelId/messages/:msgId', async (c) => {
  try {
    const s = await requireAuth(c);
    const deleted = await Community.deleteMessage(c.env, c.req.param('msgId'), s.userId);
    if (!deleted) return fail(c, 404, 'Message not found');
    return c.json({ success: true, message: 'Message deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete message');
  }
});

// ── Threads ────────────────────────────────────────────────────────────────

// GET /api/v1/community/messages/:msgId/threads
community.get('/messages/:msgId/threads', async (c) => {
  try {
    await requireAuth(c);
    const replies = await Community.getThreadReplies(c.env, c.req.param('msgId'));
    return c.json({ success: true, data: replies });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load thread replies');
  }
});

// POST /api/v1/community/messages/:msgId/threads
community.post('/messages/:msgId/threads', async (c) => {
  try {
    const s = await requireAuth(c);
    const input = await body(c);
    if (typeof input.content !== 'string' || input.content.length < 1 || input.content.length > 5000) {
      return validationError(c, { content: ['String must contain at least 1 character(s)'] });
    }
    const { content } = input;
    if (!content || !content.trim()) return fail(c, 401, 'Content is required');

    const parent = await Community.getMessageById(c.env, c.req.param('msgId'));
    if (!parent) return fail(c, 404, 'Message not found');

    const reply = await Community.createMessage(c.env, {
      channel_id: parent.channel_id,
      author_id: s.userId,
      content: content.trim(),
      parent_message_id: c.req.param('msgId'),
    });

    // Notify parent author
    if (parent.author_id !== s.userId) {
      await notify(c.env, {
        user_id: parent.author_id,
        title: 'New reply to your message',
        message: `${reply.author_name} replied to your message`,
        type: 'info',
      });
    }

    return c.json({ success: true, data: reply }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create thread reply');
  }
});

// ── Reactions ──────────────────────────────────────────────────────────────

// POST /api/v1/community/messages/:msgId/reactions
community.post('/messages/:msgId/reactions', async (c) => {
  try {
    const s = await requireAuth(c);
    const input = await body(c);
    if (typeof input.emoji !== 'string' || input.emoji.length < 1 || input.emoji.length > 10) {
      return validationError(c, { emoji: ['String must contain at least 1 character(s)'] });
    }

    const message = await Community.getMessageById(c.env, c.req.param('msgId'));
    if (!message) return fail(c, 404, 'Message not found');

    await Community.addReaction(c.env, c.req.param('msgId'), s.userId, input.emoji);
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to add reaction');
  }
});

// DELETE /api/v1/community/messages/:msgId/reactions/:emoji
community.delete('/messages/:msgId/reactions/:emoji', async (c) => {
  try {
    const s = await requireAuth(c);
    const message = await Community.getMessageById(c.env, c.req.param('msgId'));
    if (!message) return fail(c, 404, 'Message not found');

    await Community.removeReaction(c.env, c.req.param('msgId'), s.userId, c.req.param('emoji'));
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to remove reaction');
  }
});

// ── Pins ───────────────────────────────────────────────────────────────────

// GET /api/v1/community/channels/:id/pins
community.get('/channels/:id/pins', async (c) => {
  try {
    await requireAuth(c);
    const pins = await Community.getPinnedMessages(c.env, c.req.param('id'));
    return c.json({ success: true, data: pins });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load pinned messages');
  }
});

// POST /api/v1/community/channels/:id/pins/:msgId
community.post('/channels/:id/pins/:msgId', async (c) => {
  try {
    const s = await requireAuth(c);
    const channelId = c.req.param('id');
    const member = await Community.isChannelMember(c.env, channelId, s.userId);
    if (!member || !['owner', 'moderator'].includes(member.role)) {
      return fail(c, 403, 'Only moderators can pin messages');
    }

    await Community.pinMessage(c.env, channelId, c.req.param('msgId'), s.userId);
    return c.json({ success: true, message: 'Message pinned' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to pin message');
  }
});

// DELETE /api/v1/community/channels/:id/pins/:msgId
community.delete('/channels/:id/pins/:msgId', async (c) => {
  try {
    const s = await requireAuth(c);
    const channelId = c.req.param('id');
    const member = await Community.isChannelMember(c.env, channelId, s.userId);
    if (!member || !['owner', 'moderator'].includes(member.role)) {
      return fail(c, 403, 'Only moderators can unpin messages');
    }

    await Community.unpinMessage(c.env, channelId, c.req.param('msgId'));
    return c.json({ success: true, message: 'Message unpinned' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to unpin message');
  }
});

// ── Search ─────────────────────────────────────────────────────────────────

// GET /api/v1/community/search?q=
community.get('/search', async (c) => {
  try {
    const s = await requireAuth(c);
    const q = c.req.query('q');
    if (!q || q.trim().length < 2) {
      return fail(c, 401, 'Search query must be at least 2 characters');
    }

    const results = await Community.searchMessages(c.env, s.userId, q.trim());
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to search messages');
  }
});

// ── Reports ────────────────────────────────────────────────────────────────

// POST /api/v1/community/reports
community.post('/reports', async (c) => {
  try {
    const s = await requireAuth(c);
    const input = await body(c);
    const errors: Record<string, string[]> = {};
    if (!['message', 'user'].includes(input.target_type)) errors.target_type = ['Invalid enum value'];
    if (!isUuid(input.target_id)) errors.target_id = ['Invalid uuid'];
    if (typeof input.reason !== 'string' || input.reason.length < 1 || input.reason.length > 100) {
      errors.reason = ['String must contain at least 1 character(s)'];
    }
    if (input.description !== undefined && (typeof input.description !== 'string' || input.description.length > 1000)) {
      errors.description = ['String must contain at most 1000 character(s)'];
    }
    if (Object.keys(errors).length) return validationError(c, errors);

    const report = await Community.createReport(c.env, {
      reporter_id: s.userId,
      target_type: input.target_type,
      target_id: input.target_id,
      reason: input.reason,
      description: input.description,
    });
    return c.json({ success: true, data: report }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create report');
  }
});

// ── Admin / Moderation ─────────────────────────────────────────────────────

// GET /api/v1/community/admin/reports
community.get('/admin/reports', async (c) => {
  try {
    await requireRole(c, ['admin', 'super_admin']);
    const reports = await Community.getReports(c.env, c.req.query('status') || undefined);
    return c.json({ success: true, data: reports });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load reports');
  }
});

// PUT /api/v1/community/admin/reports/:id
community.put('/admin/reports/:id', async (c) => {
  try {
    const s = await requireRole(c, ['admin', 'super_admin']);
    const { status } = await body(c);
    if (!['reviewed', 'resolved', 'dismissed'].includes(status)) {
      return fail(c, 401, 'Invalid status');
    }
    const updated = await Community.updateReportStatus(c.env, c.req.param('id'), status, s.userId);
    if (!updated) return fail(c, 404, 'Report not found');
    return c.json({ success: true, message: 'Report updated' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update report');
  }
});

// POST /api/v1/community/admin/moderate
community.post('/admin/moderate', async (c) => {
  try {
    const s = await requireRole(c, ['admin', 'super_admin', 'instructor']);
    const input = await body(c);
    const errors: Record<string, string[]> = {};
    if (!isUuid(input.target_user_id)) errors.target_user_id = ['Invalid uuid'];
    if (input.channel_id !== undefined && !isUuid(input.channel_id)) errors.channel_id = ['Invalid uuid'];
    if (!['mute', 'unmute', 'ban', 'unban', 'warn', 'delete_message'].includes(input.action)) {
      errors.action = ['Invalid enum value'];
    }
    if (input.reason !== undefined && (typeof input.reason !== 'string' || input.reason.length > 500)) {
      errors.reason = ['String must contain at most 500 character(s)'];
    }
    if (input.duration !== undefined && typeof input.duration !== 'string') {
      errors.duration = ['Expected string'];
    }
    if (Object.keys(errors).length) return validationError(c, errors);

    await Community.createModerationAction(c.env, {
      moderator_id: s.userId,
      ...input,
    });

    if (input.action === 'delete_message') {
      await Community.deleteMessage(c.env, input.target_user_id, s.userId);
    }

    // Notify target user
    await notify(c.env, {
      user_id: input.target_user_id,
      title: 'Moderation action',
      message: `A moderator has ${input.action}ed you${input.reason ? ': ' + input.reason : ''}`,
      type: 'warning',
    });

    return c.json({ success: true, message: 'Moderation action applied' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to apply moderation action');
  }
});

// ── Invites ────────────────────────────────────────────────────────────────

// POST /api/v1/community/channels/:id/invite
community.post('/channels/:id/invite', async (c) => {
  try {
    const s = await requireAuth(c);
    const channelId = c.req.param('id');
    const member = await Community.isChannelMember(c.env, channelId, s.userId);
    if (!member || !['owner', 'moderator'].includes(member.role)) {
      return fail(c, 403, 'Only channel owners and moderators can create invites');
    }

    const input = await body(c);
    if (input.max_uses !== undefined && (!Number.isInteger(input.max_uses) || input.max_uses <= 0)) {
      return validationError(c, { max_uses: ['Number must be greater than 0'] });
    }
    if (input.expires_in !== undefined && typeof input.expires_in !== 'string') {
      return validationError(c, { expires_in: ['Expected string'] });
    }

    const invite = await Community.createInvite(c.env, channelId, s.userId, input.max_uses, input.expires_in);
    return c.json({ success: true, data: invite }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create invite');
  }
});

// POST /api/v1/community/invites/:code/join
community.post('/invites/:code/join', async (c) => {
  try {
    const s = await requireAuth(c);
    const invite = await Community.findInviteByCode(c.env, c.req.param('code'));
    if (!invite) return fail(c, 404, 'Invite not found');

    await Community.useInvite(c.env, c.req.param('code'));
    const member = await Community.joinChannel(c.env, invite.channel_id, s.userId);

    const channel = await Community.getChannelById(c.env, invite.channel_id);
    return c.json({ success: true, data: { channel, member } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to join invite');
  }
});

// ══════════════════════════════════════════════════════════════════════════
// Community management (full CRUD, membership, rules, etc.)
// ══════════════════════════════════════════════════════════════════════════

// ── Community CRUD ─────────────────────────────────────────────────────────

// GET /api/v1/community/communities
community.get('/communities', async (c) => {
  try {
    const s = await requireAuth(c);
    const communities = await Community.getCommunities(c.env, s.userId);
    return c.json({ success: true, data: communities });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load communities');
  }
});

// POST /api/v1/community/communities
community.post('/communities', async (c) => {
  try {
    const s = await requireAuth(c);
    const input = await body(c);
    const errors: Record<string, string[]> = {};
    if (typeof input.name !== 'string' || input.name.length < 1 || input.name.length > 100) {
      errors.name = ['String must contain at least 1 character(s)'];
    }
    if (typeof input.slug !== 'string' || input.slug.length < 1 || input.slug.length > 150) {
      errors.slug = ['String must contain at least 1 character(s)'];
    } else if (!/^[a-z0-9-]+$/.test(input.slug)) {
      errors.slug = ['Slug must be lowercase alphanumeric with hyphens'];
    }
    if (input.description !== undefined && (typeof input.description !== 'string' || input.description.length > 2000)) {
      errors.description = ['String must contain at most 2000 character(s)'];
    }
    if (input.image_url !== undefined && typeof input.image_url !== 'string') errors.image_url = ['Invalid url'];
    if (input.category !== undefined && (typeof input.category !== 'string' || input.category.length > 50)) {
      errors.category = ['String must contain at most 50 character(s)'];
    }
    if (input.visibility !== undefined && !['public', 'private', 'restricted'].includes(input.visibility)) {
      errors.visibility = ['Invalid enum value'];
    }
    if (input.join_policy !== undefined && !['open', 'approval', 'invite_only'].includes(input.join_policy)) {
      errors.join_policy = ['Invalid enum value'];
    }
    if (input.rules !== undefined && (typeof input.rules !== 'string' || input.rules.length > 5000)) {
      errors.rules = ['String must contain at most 5000 character(s)'];
    }
    if (Object.keys(errors).length) return validationError(c, errors);

    const created = await Community.createCommunity(c.env, {
      ...input,
      created_by: s.userId,
    });
    return c.json({ success: true, data: created }, 201);
  } catch (e: any) {
    if (isUniqueViolation(e)) {
      return fail(c, 409, 'A community with that slug already exists');
    }
    return fail(c, statusOf(e), e?.message || 'Failed to create community');
  }
});

// GET /api/v1/community/communities/search?q=
community.get('/communities/search', async (c) => {
  try {
    await requireAuth(c);
    const q = c.req.query('q');
    if (!q || q.trim().length < 2) {
      return fail(c, 401, 'Search query must be at least 2 characters');
    }
    const results = await Community.searchCommunities(c.env, q.trim());
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to search communities');
  }
});

// GET /api/v1/community/communities/:id
community.get('/communities/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const found = await Community.getCommunityById(c.env, c.req.param('id'));
    if (!found) return fail(c, 404, 'Community not found');

    const membership = await Community.isCommunityMember(c.env, found.id, s.userId);
    const stats = await Community.getCommunityStats(c.env, found.id);

    return c.json({
      success: true,
      data: {
        ...found,
        ...stats,
        is_member: !!membership,
        my_role: membership?.role,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load community');
  }
});

// PUT /api/v1/community/communities/:id
community.put('/communities/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    await requireCommunityRole(c, c.req.param('id'), s.userId, ['owner', 'admin'], s.role);

    const input = await body(c);
    const errors: Record<string, string[]> = {};
    if (input.name !== undefined && (typeof input.name !== 'string' || input.name.length < 1 || input.name.length > 100)) {
      errors.name = ['String must contain at least 1 character(s)'];
    }
    if (input.description !== undefined && (typeof input.description !== 'string' || input.description.length > 2000)) {
      errors.description = ['String must contain at most 2000 character(s)'];
    }
    if (input.image_url !== undefined && input.image_url !== null && typeof input.image_url !== 'string') {
      errors.image_url = ['Invalid url'];
    }
    if (input.category !== undefined && (typeof input.category !== 'string' || input.category.length > 50)) {
      errors.category = ['String must contain at most 50 character(s)'];
    }
    if (input.visibility !== undefined && !['public', 'private', 'restricted'].includes(input.visibility)) {
      errors.visibility = ['Invalid enum value'];
    }
    if (input.join_policy !== undefined && !['open', 'approval', 'invite_only'].includes(input.join_policy)) {
      errors.join_policy = ['Invalid enum value'];
    }
    if (input.rules !== undefined && input.rules !== null && (typeof input.rules !== 'string' || input.rules.length > 5000)) {
      errors.rules = ['String must contain at most 5000 character(s)'];
    }
    if (Object.keys(errors).length) return validationError(c, errors);

    const updated = await Community.updateCommunity(c.env, c.req.param('id'), input);
    if (!updated) return fail(c, 404, 'Community not found');
    return c.json({ success: true, data: updated });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update community');
  }
});

// DELETE /api/v1/community/communities/:id
community.delete('/communities/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    await requireCommunityRole(c, c.req.param('id'), s.userId, ['owner'], s.role);

    const deleted = await Community.deleteCommunity(c.env, c.req.param('id'));
    if (!deleted) return fail(c, 404, 'Community not found');
    return c.json({ success: true, message: 'Community deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete community');
  }
});

// POST /api/v1/community/communities/:id/archive
community.post('/communities/:id/archive', async (c) => {
  try {
    const s = await requireAuth(c);
    await requireCommunityRole(c, c.req.param('id'), s.userId, ['owner'], s.role);

    const archived = await Community.archiveCommunity(c.env, c.req.param('id'));
    if (!archived) return fail(c, 404, 'Community not found');
    return c.json({ success: true, message: 'Community archived' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to archive community');
  }
});

// ── Community Membership ───────────────────────────────────────────────────

// POST /api/v1/community/communities/:id/join
community.post('/communities/:id/join', async (c) => {
  try {
    const s = await requireAuth(c);
    const communityId = c.req.param('id');
    const found = await Community.getCommunityById(c.env, communityId);
    if (!found) return fail(c, 404, 'Community not found');
    if (found.is_archived) return fail(c, 403, 'Community is archived');

    const existing = await Community.isCommunityMember(c.env, communityId, s.userId);
    if (existing) {
      return c.json({ success: true, message: 'Already a member', data: existing });
    }

    if (found.join_policy === 'invite_only') {
      return fail(c, 403, 'This community is invite only');
    }

    if (found.join_policy === 'approval') {
      const db = getDb(c.env);
      const existingReq = (await db.query<any>(
        'SELECT * FROM community_join_requests WHERE community_id = $1 AND user_id = $2',
        [communityId, s.userId]
      )).rows[0];
      if (existingReq?.status === 'pending') {
        return c.json({ success: true, requested: true, status: 'pending' });
      }
      await db.query(
        `INSERT INTO community_join_requests (community_id, user_id, status)
         VALUES ($1, $2, 'pending')
         ON CONFLICT (community_id, user_id)
         DO UPDATE SET status = 'pending', decided_by = NULL, decided_at = NULL, updated_at = NOW()`,
        [communityId, s.userId]
      );
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, 'Community join request', $2, 'info', $3)`,
        [found.created_by, `A student requested to join "${found.name}".`, '/instructor/communities']
      );
      const creator = (await db.query<any>('SELECT name, email FROM users WHERE id = $1', [found.created_by])).rows[0];
      if (creator?.email) {
        c.executionCtx.waitUntil(mail.communityRequest(c.env, creator.email, creator.name, `${found.name} (new request)`, true).catch(() => {}));
      }
      return c.json({ success: true, requested: true, status: 'pending' });
    }

    const member = await Community.joinCommunity(c.env, communityId, s.userId);
    return c.json({ success: true, data: member });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to join community');
  }
});

// GET /api/v1/community/communities/:id/requests (owner/admin/moderator)
community.get('/communities/:id/requests', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const found = await Community.getCommunityById(c.env, c.req.param('id'));
    if (!found) return fail(c, 404, 'Community not found');
    const membership = await Community.isCommunityMember(c.env, found.id, s.userId);
    const canManage = found.created_by === s.userId || ['admin', 'super_admin'].includes(s.role) || ['owner', 'admin', 'moderator'].includes(membership?.role);
    if (!canManage) return fail(c, 403, 'You do not have permission to review requests');

    const { rows } = await db.query<any>(
      `SELECT r.*, u.name, u.email, u.avatar FROM community_join_requests r
       JOIN users u ON u.id = r.user_id
       WHERE r.community_id = $1 AND r.status = 'pending'
       ORDER BY r.created_at ASC`,
      [found.id]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load requests');
  }
});

// PUT /api/v1/community/communities/:id/requests/:requestId
community.put('/communities/:id/requests/:requestId', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!['approved', 'rejected'].includes(body.status)) return fail(c, 400, 'status must be approved or rejected');
    const db = getDb(c.env);
    const found = await Community.getCommunityById(c.env, c.req.param('id'));
    if (!found) return fail(c, 404, 'Community not found');
    const membership = await Community.isCommunityMember(c.env, found.id, s.userId);
    const canManage = found.created_by === s.userId || ['admin', 'super_admin'].includes(s.role) || ['owner', 'admin', 'moderator'].includes(membership?.role);
    if (!canManage) return fail(c, 403, 'You do not have permission to review requests');

    const request = (await db.query<any>(
      'SELECT * FROM community_join_requests WHERE id = $1 AND community_id = $2',
      [c.req.param('requestId'), found.id]
    )).rows[0];
    if (!request) return fail(c, 404, 'Request not found');

    await db.query(
      `UPDATE community_join_requests SET status = $1, decided_by = $2, decided_at = NOW(), updated_at = NOW() WHERE id = $3`,
      [body.status, s.userId, request.id]
    );

    if (body.status === 'approved') {
      await Community.joinCommunity(c.env, found.id, request.user_id);
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, 'Community request approved', $2, 'success', $3)`,
        [request.user_id, `You're now a member of "${found.name}".`, '/student/community']
      );
    } else {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, 'Community request declined', $2, 'info', $3)`,
        [request.user_id, `Your request to join "${found.name}" was declined.`, '/student/community']
      );
    }

    const requester = (await db.query<any>('SELECT name, email FROM users WHERE id = $1', [request.user_id])).rows[0];
    if (requester?.email) {
      c.executionCtx.waitUntil(
        mail.communityRequest(c.env, requester.email, requester.name, found.name, body.status === 'approved').catch(() => {})
      );
    }
    return c.json({ success: true, message: `Request ${body.status}` });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update request');
  }
});

// GET /api/v1/community/my-requests
community.get('/my-requests', async (c) => {
  try {
    const s = await requireAuth(c);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT r.*, c.name AS community_name, c.slug AS community_slug
       FROM community_join_requests r JOIN communities c ON c.id = r.community_id
       WHERE r.user_id = $1 ORDER BY r.created_at DESC`,
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load requests');
  }
});

// POST /api/v1/community/communities/:id/leave
community.post('/communities/:id/leave', async (c) => {
  try {
    const s = await requireAuth(c);
    await Community.leaveCommunity(c.env, c.req.param('id'), s.userId);
    return c.json({ success: true, message: 'Left community' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to leave community');
  }
});

// GET /api/v1/community/communities/:id/members
community.get('/communities/:id/members', async (c) => {
  try {
    const s = await requireAuth(c);
    const communityId = c.req.param('id');
    const found = await Community.getCommunityById(c.env, communityId);
    if (!found) return fail(c, 404, 'Community not found');

    const isAdmin = ['admin', 'super_admin'].includes(s.role);
    const membership = await Community.isCommunityMember(c.env, communityId, s.userId);
    if (!membership && !isAdmin) return fail(c, 403, 'You must be a member to view members');

    const members = await Community.getCommunityMembers(c.env, communityId);
    return c.json({ success: true, data: members });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load community members');
  }
});

// PUT /api/v1/community/communities/:id/members/:userId/role
community.put('/communities/:id/members/:userId/role', async (c) => {
  try {
    const s = await requireAuth(c);
    const communityId = c.req.param('id');
    await requireCommunityRole(c, communityId, s.userId, ['owner', 'admin'], s.role);

    const { role } = await body(c);
    if (!['admin', 'moderator', 'member'].includes(role)) {
      return validationError(c, { role: ['Invalid enum value'] });
    }

    const updated = await Community.updateCommunityMemberRole(c.env, communityId, c.req.param('userId'), role);
    if (!updated) return fail(c, 404, 'Member not found');
    return c.json({ success: true, message: 'Member role updated' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update member role');
  }
});

// POST /api/v1/community/communities/:id/members/:userId/ban
community.post('/communities/:id/members/:userId/ban', async (c) => {
  try {
    const s = await requireAuth(c);
    const communityId = c.req.param('id');
    await requireCommunityRole(c, communityId, s.userId, ['owner', 'admin', 'moderator'], s.role);

    const banned = await Community.banCommunityMember(c.env, communityId, c.req.param('userId'));
    if (!banned) return fail(c, 404, 'Member not found');
    return c.json({ success: true, message: 'Member banned' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to ban member');
  }
});

// POST /api/v1/community/communities/:id/members/:userId/unban
community.post('/communities/:id/members/:userId/unban', async (c) => {
  try {
    const s = await requireAuth(c);
    const communityId = c.req.param('id');
    await requireCommunityRole(c, communityId, s.userId, ['owner', 'admin', 'moderator'], s.role);

    const unbanned = await Community.unbanCommunityMember(c.env, communityId, c.req.param('userId'));
    if (!unbanned) return fail(c, 404, 'Member not found');
    return c.json({ success: true, message: 'Member unbanned' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to unban member');
  }
});

// POST /api/v1/community/communities/:id/members/:userId/mute
community.post('/communities/:id/members/:userId/mute', async (c) => {
  try {
    const s = await requireAuth(c);
    const communityId = c.req.param('id');
    await requireCommunityRole(c, communityId, s.userId, ['owner', 'admin', 'moderator'], s.role);

    const muted = await Community.muteCommunityMember(c.env, communityId, c.req.param('userId'));
    if (!muted) return fail(c, 404, 'Member not found');
    return c.json({ success: true, message: 'Member muted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to mute member');
  }
});

// POST /api/v1/community/communities/:id/members/:userId/unmute
community.post('/communities/:id/members/:userId/unmute', async (c) => {
  try {
    const s = await requireAuth(c);
    const communityId = c.req.param('id');
    await requireCommunityRole(c, communityId, s.userId, ['owner', 'admin', 'moderator'], s.role);

    const unmuted = await Community.unmuteCommunityMember(c.env, communityId, c.req.param('userId'));
    if (!unmuted) return fail(c, 404, 'Member not found');
    return c.json({ success: true, message: 'Member unmuted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to unmute member');
  }
});

// ── Community Rules ────────────────────────────────────────────────────────

// GET /api/v1/community/communities/:id/rules
community.get('/communities/:id/rules', async (c) => {
  try {
    await requireAuth(c);
    const rules = await Community.getCommunityRules(c.env, c.req.param('id'));
    return c.json({ success: true, data: rules });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load rules');
  }
});

// POST /api/v1/community/communities/:id/rules
community.post('/communities/:id/rules', async (c) => {
  try {
    const s = await requireAuth(c);
    const communityId = c.req.param('id');
    await requireCommunityRole(c, communityId, s.userId, ['owner', 'admin', 'moderator'], s.role);

    const input = await body(c);
    const errors: Record<string, string[]> = {};
    if (typeof input.title !== 'string' || input.title.length < 1 || input.title.length > 200) {
      errors.title = ['String must contain at least 1 character(s)'];
    }
    if (input.description !== undefined && (typeof input.description !== 'string' || input.description.length > 1000)) {
      errors.description = ['String must contain at most 1000 character(s)'];
    }
    if (input.sort_order !== undefined && !Number.isInteger(input.sort_order)) {
      errors.sort_order = ['Expected integer'];
    }
    if (Object.keys(errors).length) return validationError(c, errors);

    const rule = await Community.createCommunityRule(c.env, communityId, input);
    return c.json({ success: true, data: rule }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create rule');
  }
});

// PUT /api/v1/community/communities/:id/rules/:ruleId
community.put('/communities/:id/rules/:ruleId', async (c) => {
  try {
    const s = await requireAuth(c);
    const communityId = c.req.param('id');
    await requireCommunityRole(c, communityId, s.userId, ['owner', 'admin', 'moderator'], s.role);

    const input = await body(c);
    const errors: Record<string, string[]> = {};
    if (input.title !== undefined && (typeof input.title !== 'string' || input.title.length < 1 || input.title.length > 200)) {
      errors.title = ['String must contain at least 1 character(s)'];
    }
    if (input.description !== undefined && (typeof input.description !== 'string' || input.description.length > 1000)) {
      errors.description = ['String must contain at most 1000 character(s)'];
    }
    if (input.sort_order !== undefined && !Number.isInteger(input.sort_order)) {
      errors.sort_order = ['Expected integer'];
    }
    if (Object.keys(errors).length) return validationError(c, errors);

    const rule = await Community.updateCommunityRule(c.env, c.req.param('ruleId'), input);
    if (!rule) return fail(c, 404, 'Rule not found');
    return c.json({ success: true, data: rule });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update rule');
  }
});

// DELETE /api/v1/community/communities/:id/rules/:ruleId
community.delete('/communities/:id/rules/:ruleId', async (c) => {
  try {
    const s = await requireAuth(c);
    const communityId = c.req.param('id');
    await requireCommunityRole(c, communityId, s.userId, ['owner', 'admin', 'moderator'], s.role);

    const deleted = await Community.deleteCommunityRule(c.env, c.req.param('ruleId'));
    if (!deleted) return fail(c, 404, 'Rule not found');
    return c.json({ success: true, message: 'Rule deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete rule');
  }
});

// ── Community Stats ────────────────────────────────────────────────────────

// GET /api/v1/community/communities/:id/stats
community.get('/communities/:id/stats', async (c) => {
  try {
    await requireAuth(c);
    const communityId = c.req.param('id');
    const found = await Community.getCommunityById(c.env, communityId);
    if (!found) return fail(c, 404, 'Community not found');

    const stats = await Community.getCommunityStats(c.env, communityId);
    return c.json({ success: true, data: stats });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load community stats');
  }
});

// ── Community Invites ──────────────────────────────────────────────────────

// POST /api/v1/community/communities/:id/invites
community.post('/communities/:id/invites', async (c) => {
  try {
    const s = await requireAuth(c);
    const communityId = c.req.param('id');
    await requireCommunityRole(c, communityId, s.userId, ['owner', 'admin', 'moderator'], s.role);

    const input = await body(c);
    if (input.max_uses !== undefined && (!Number.isInteger(input.max_uses) || input.max_uses <= 0)) {
      return validationError(c, { max_uses: ['Number must be greater than 0'] });
    }
    if (input.expires_in !== undefined && typeof input.expires_in !== 'string') {
      return validationError(c, { expires_in: ['Expected string'] });
    }

    const invite = await Community.createCommunityInvite(
      c.env,
      communityId,
      s.userId,
      input.max_uses,
      input.expires_in
    );
    return c.json({ success: true, data: invite }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create invite');
  }
});

// POST /api/v1/community/communities/invites/:code/join
community.post('/communities/invites/:code/join', async (c) => {
  try {
    const s = await requireAuth(c);
    const invite = await Community.findCommunityInviteByCode(c.env, c.req.param('code'));
    if (!invite) return fail(c, 404, 'Invite not found');

    const existing = await Community.isCommunityMember(c.env, invite.community_id, s.userId);
    if (existing) {
      return c.json({ success: true, message: 'Already a member', data: existing });
    }

    await Community.useCommunityInvite(c.env, c.req.param('code'));
    const member = await Community.joinCommunity(c.env, invite.community_id, s.userId);

    const found = await Community.getCommunityById(c.env, invite.community_id);
    return c.json({ success: true, data: { community: found, member } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to join community invite');
  }
});

// ── Community Channels ─────────────────────────────────────────────────────

// GET /api/v1/community/communities/:id/channels
community.get('/communities/:id/channels', async (c) => {
  try {
    await requireAuth(c);
    const communityId = c.req.param('id');
    const found = await Community.getCommunityById(c.env, communityId);
    if (!found) return fail(c, 404, 'Community not found');

    const channels = await Community.getCommunityChannels(c.env, communityId);
    return c.json({ success: true, data: channels });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load community channels');
  }
});

export default community;
