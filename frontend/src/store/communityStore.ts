import { create } from 'zustand';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { io, Socket } from 'socket.io-client';

export interface CommunityCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
}

export interface CommunityChannel {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  type: 'text' | 'announcement' | 'project_showcase';
  is_public: boolean;
  is_archived: boolean;
  created_by: string | null;
  member_count: number;
  created_at: string;
  updated_at: string;
  category_name?: string;
  category_slug?: string;
  is_member?: boolean;
  my_request_status?: string | null;
  my_role?: string;
  last_message_at?: string;
  last_message_content?: string;
  last_message_author?: string;
}

export interface ChannelMessage {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  edited: boolean;
  deleted: boolean;
  parent_message_id: string | null;
  is_thread_parent: boolean;
  thread_count: number;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_avatar?: string | null;
  author_role?: string;
  reactions?: ReactionGroup[];
  is_pinned?: boolean;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  user_ids: string[];
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  role: 'owner' | 'moderator' | 'member';
  is_muted: boolean;
  joined_at: string;
  user_name?: string;
  user_email?: string;
  user_avatar?: string | null;
  user_role?: string;
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  category: string;
  visibility: 'public' | 'private' | 'restricted';
  join_policy: 'open' | 'approval' | 'invite_only';
  created_by: string;
  member_count: number;
  channel_count: number;
  is_archived: boolean;
  rules: string | null;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  creator_avatar?: string | null;
  is_member?: boolean;
  my_request_status?: string | null;
  my_role?: string;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  is_muted: boolean;
  is_banned: boolean;
  joined_at: string;
  user_name?: string;
  user_email?: string;
  user_avatar?: string | null;
  user_role?: string;
  is_online?: boolean;
}

export interface CommunityRule {
  id: string;
  community_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface CommunityStats {
  totalMembers: number;
  totalChannels: number;
  activeToday: number;
  totalMessages: number;
}

interface CommunityState {
  socket: Socket | null;
  categories: CommunityCategory[];
  channels: CommunityChannel[];
  activeChannel: CommunityChannel | null;
  messages: ChannelMessage[];
  members: ChannelMember[];
  threadMessages: ChannelMessage[];
  activeThread: ChannelMessage | null;
  onlineUsers: Set<string>;
  typingUsers: Map<string, Set<string>>;
  searchResults: ChannelMessage[];
  isSearching: boolean;
  isLoading: boolean;
  communities: Community[];
  activeCommunity: Community | null;
  communityMembers: CommunityMember[];
  communityRules: CommunityRule[];
  communityStats: CommunityStats | null;

  initializeSocket: () => void;
  disconnectSocket: () => void;
  fetchCategories: () => Promise<void>;
  fetchChannels: () => Promise<void>;
  setActiveChannel: (channel: CommunityChannel) => void;
  joinChannel: (channelId: string) => Promise<void>;
  leaveChannel: (channelId: string) => Promise<void>;
  fetchMessages: (channelId: string) => Promise<void>;
  sendMessage: (channelId: string, content: string, file?: File) => Promise<void>;
  editMessage: (channelId: string, msgId: string, content: string) => Promise<void>;
  deleteMessage: (channelId: string, msgId: string) => Promise<void>;
  addReaction: (msgId: string, emoji: string) => Promise<void>;
  removeReaction: (msgId: string, emoji: string) => Promise<void>;
  fetchThread: (msgId: string) => Promise<void>;
  replyToThread: (msgId: string, content: string) => Promise<void>;
  fetchMembers: (channelId: string) => Promise<void>;
  searchMessages: (query: string) => Promise<void>;
  pinMessage: (channelId: string, msgId: string) => Promise<void>;
  unpinMessage: (channelId: string, msgId: string) => Promise<void>;
  addMessage: (message: ChannelMessage) => void;
  updateMessage: (message: ChannelMessage) => void;
  removeMessage: (msgId: string) => void;
  fetchCommunities: () => Promise<void>;
  fetchCommunityById: (id: string) => Promise<void>;
  createCommunity: (data: { name: string; slug: string; description?: string; category: string; visibility?: string; join_policy?: string; image_url?: string }) => Promise<Community | null>;
  updateCommunity: (id: string, data: Partial<Community>) => Promise<void>;
  deleteCommunity: (id: string) => Promise<void>;
  archiveCommunity: (id: string) => Promise<void>;
  joinCommunity: (id: string) => Promise<void>;
  leaveCommunity: (id: string) => Promise<void>;
  fetchCommunityMembers: (id: string) => Promise<void>;
  updateMemberRole: (communityId: string, userId: string, role: string) => Promise<void>;
  banMember: (communityId: string, userId: string) => Promise<void>;
  unbanMember: (communityId: string, userId: string) => Promise<void>;
  muteMember: (communityId: string, userId: string) => Promise<void>;
  unmuteMember: (communityId: string, userId: string) => Promise<void>;
  fetchCommunityRules: (id: string) => Promise<void>;
  createCommunityRule: (communityId: string, data: { title: string; description?: string }) => Promise<void>;
  updateCommunityRule: (communityId: string, ruleId: string, data: { title?: string; description?: string }) => Promise<void>;
  deleteCommunityRule: (communityId: string, ruleId: string) => Promise<void>;
  fetchCommunityStats: (id: string) => Promise<void>;
  searchCommunities: (query: string) => Promise<void>;
  setActiveCommunity: (community: Community | null) => void;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  socket: null,
  categories: [],
  channels: [],
  activeChannel: null,
  messages: [],
  members: [],
  threadMessages: [],
  activeThread: null,
  onlineUsers: new Set(),
  typingUsers: new Map(),
  searchResults: [],
  isSearching: false,
  isLoading: false,
  communities: [],
  activeCommunity: null,
  communityMembers: [],
  communityRules: [],
  communityStats: null,

  initializeSocket: () => {
    const existing = get().socket;
    if (existing) return;

    const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
    const token = useAuthStore.getState().token;
    if (!token) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
    });

    socket.on('connect', () => {
      console.log('[Community] Socket connected');
    });

    socket.on('community:message', (data: { message: ChannelMessage }) => {
      const { activeChannel } = get();
      if (activeChannel && data.message.channel_id === activeChannel.id) {
        get().addMessage(data.message);
      }
    });

    socket.on('community:edit', (data: { message: ChannelMessage }) => {
      get().updateMessage(data.message);
    });

    socket.on('community:delete', (data: { messageId: string }) => {
      get().removeMessage(data.messageId);
    });

    socket.on('community:reaction', (data: { messageId: string; emoji: string; userId: string; action: 'add' | 'remove' }) => {
      set((state) => ({
        messages: state.messages.map((msg) => {
          if (msg.id !== data.messageId) return msg;
          const reactions = msg.reactions ? [...msg.reactions] : [];
          const idx = reactions.findIndex((r) => r.emoji === data.emoji);
          if (data.action === 'add') {
            if (idx >= 0) {
              if (!reactions[idx].user_ids.includes(data.userId)) {
                reactions[idx].count++;
                reactions[idx].user_ids.push(data.userId);
              }
            } else {
              reactions.push({ emoji: data.emoji, count: 1, user_ids: [data.userId] });
            }
          } else {
            if (idx >= 0) {
              reactions[idx].count--;
              reactions[idx].user_ids = reactions[idx].user_ids.filter((id) => id !== data.userId);
              if (reactions[idx].count <= 0) reactions.splice(idx, 1);
            }
          }
          return { ...msg, reactions };
        }),
      }));
    });

    socket.on('community:thread', (data: { parentMessageId: string; reply: ChannelMessage }) => {
      const { activeThread } = get();
      if (activeThread && activeThread.id === data.parentMessageId) {
        set((state) => ({ threadMessages: [...state.threadMessages, data.reply] }));
      }
      // Update thread_count on parent message
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === data.parentMessageId ? { ...msg, thread_count: (msg.thread_count || 0) + 1 } : msg
        ),
      }));
    });

    socket.on('community:typing', (data: { channelId: string; userId: string; isTyping: boolean }) => {
      set((state) => {
        const next = new Map(state.typingUsers);
        const channelTypers = new Set(next.get(data.channelId) || []);
        if (data.isTyping) channelTypers.add(data.userId);
        else channelTypers.delete(data.userId);
        next.set(data.channelId, channelTypers);
        return { typingUsers: next };
      });
    });

    socket.on('community:channel_created', () => {
      get().fetchChannels();
    });

    socket.on('community:channel_deleted', (data: { channelId: string }) => {
      set((state) => ({
        channels: state.channels.filter((c) => c.id !== data.channelId),
        activeChannel: state.activeChannel?.id === data.channelId ? null : state.activeChannel,
      }));
    });

    socket.on('community:member_joined', () => {
      const { activeChannel } = get();
      if (activeChannel) get().fetchMembers(activeChannel.id);
    });

    socket.on('community:member_left', () => {
      const { activeChannel } = get();
      if (activeChannel) get().fetchMembers(activeChannel.id);
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  fetchCategories: async () => {
    try {
      const { data } = await api.get('/community/categories');
      set({ categories: data.data || [] });
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  },

  fetchChannels: async () => {
    try {
      const { data } = await api.get('/community/channels');
      set({ channels: data.data || [] });
    } catch (error) {
      console.error('Failed to fetch channels', error);
    }
  },

  setActiveChannel: (channel) => {
    const { socket, activeChannel } = get();
    // Leave previous channel room
    if (activeChannel && socket) {
      socket.emit('community:leave', activeChannel.id);
    }
    set({ activeChannel: channel, messages: [], members: [], threadMessages: [], activeThread: null });
    // Join new channel room
    if (socket) {
      socket.emit('community:join', channel.id);
    }
    get().fetchMessages(channel.id);
    get().fetchMembers(channel.id);
  },

  joinChannel: async (channelId) => {
    try {
      await api.post(`/community/channels/${channelId}/join`);
      get().fetchChannels();
    } catch (error) {
      console.error('Failed to join channel', error);
    }
  },

  leaveChannel: async (channelId) => {
    try {
      await api.post(`/community/channels/${channelId}/leave`);
      set((state) => ({
        channels: state.channels.map((c) => (c.id === channelId ? { ...c, is_member: false } : c)),
        activeChannel: state.activeChannel?.id === channelId ? null : state.activeChannel,
      }));
    } catch (error) {
      console.error('Failed to leave channel', error);
    }
  },

  fetchMessages: async (channelId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/community/channels/${channelId}/messages?limit=100`);
      set({ messages: data.data || [], isLoading: false });
    } catch (error) {
      console.error('Failed to fetch messages', error);
      set({ isLoading: false });
    }
  },

  sendMessage: async (channelId, content, file) => {
    try {
      let requestData;
      let headers: Record<string, string> = {};

      if (file) {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('attachment', file);
        requestData = formData;
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        requestData = { content };
      }

      const { data } = await api.post(`/community/channels/${channelId}/messages`, requestData, { headers });
      get().addMessage(data.data);
    } catch (error) {
      console.error('Failed to send message', error);
    }
  },

  editMessage: async (channelId, msgId, content) => {
    try {
      const { data } = await api.put(`/community/channels/${channelId}/messages/${msgId}`, { content });
      get().updateMessage(data.data);
    } catch (error) {
      console.error('Failed to edit message', error);
    }
  },

  deleteMessage: async (channelId, msgId) => {
    try {
      await api.delete(`/community/channels/${channelId}/messages/${msgId}`);
      get().removeMessage(msgId);
    } catch (error) {
      console.error('Failed to delete message', error);
    }
  },

  addReaction: async (msgId, emoji) => {
    try {
      await api.post(`/community/messages/${msgId}/reactions`, { emoji });
    } catch (error) {
      console.error('Failed to add reaction', error);
    }
  },

  removeReaction: async (msgId, emoji) => {
    try {
      await api.delete(`/community/messages/${msgId}/reactions/${encodeURIComponent(emoji)}`);
    } catch (error) {
      console.error('Failed to remove reaction', error);
    }
  },

  fetchThread: async (msgId) => {
    try {
      const { data } = await api.get(`/community/messages/${msgId}/threads`);
      const parent = get().messages.find((m) => m.id === msgId) || null;
      set({ threadMessages: data.data || [], activeThread: parent });
    } catch (error) {
      console.error('Failed to fetch thread', error);
    }
  },

  replyToThread: async (msgId, content) => {
    try {
      const { data } = await api.post(`/community/messages/${msgId}/threads`, { content });
      set((state) => ({ threadMessages: [...state.threadMessages, data.data] }));
    } catch (error) {
      console.error('Failed to reply to thread', error);
    }
  },

  fetchMembers: async (channelId) => {
    try {
      const { data } = await api.get(`/community/channels/${channelId}/members`);
      set({ members: data.data || [] });
    } catch (error) {
      console.error('Failed to fetch members', error);
    }
  },

  searchMessages: async (query) => {
    if (!query.trim()) {
      set({ searchResults: [], isSearching: false });
      return;
    }
    set({ isSearching: true });
    try {
      const { data } = await api.get(`/community/search?q=${encodeURIComponent(query)}`);
      set({ searchResults: data.data || [], isSearching: false });
    } catch (error) {
      console.error('Failed to search', error);
      set({ isSearching: false });
    }
  },

  pinMessage: async (channelId, msgId) => {
    try {
      await api.post(`/community/channels/${channelId}/pins/${msgId}`);
    } catch (error) {
      console.error('Failed to pin message', error);
    }
  },

  unpinMessage: async (channelId, msgId) => {
    try {
      await api.delete(`/community/channels/${channelId}/pins/${msgId}`);
    } catch (error) {
      console.error('Failed to unpin message', error);
    }
  },

  addMessage: (message) => {
    set((state) => {
      // Deduplicate
      if (state.messages.some((m) => m.id === message.id)) return state;
      return { messages: [...state.messages, message] };
    });
  },

  updateMessage: (message) => {
    set((state) => ({
      messages: state.messages.map((m) => (m.id === message.id ? message : m)),
    }));
  },

  removeMessage: (msgId) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === msgId ? { ...m, deleted: true, content: 'This message was deleted' } : m
      ),
    }));
  },

  fetchCommunities: async () => {
    try {
      const { data } = await api.get('/community/communities');
      set({ communities: data.data || [] });
    } catch (error) {
      console.error('Failed to fetch communities', error);
    }
  },

  fetchCommunityById: async (id) => {
    try {
      const { data } = await api.get(`/community/communities/${id}`);
      set({ activeCommunity: data.data || null });
    } catch (error) {
      console.error('Failed to fetch community', error);
    }
  },

  createCommunity: async (communityData) => {
    try {
      const { data } = await api.post('/community/communities', communityData);
      const newCommunity = data.data;
      set((state) => ({ communities: [newCommunity, ...state.communities] }));
      return newCommunity;
    } catch (error) {
      console.error('Failed to create community', error);
      return null;
    }
  },

  updateCommunity: async (id, communityData) => {
    try {
      const { data } = await api.put(`/community/communities/${id}`, communityData);
      set((state) => ({
        communities: state.communities.map((c) => (c.id === id ? { ...c, ...data.data } : c)),
        activeCommunity: state.activeCommunity?.id === id ? { ...state.activeCommunity, ...data.data } : state.activeCommunity,
      }));
    } catch (error) {
      console.error('Failed to update community', error);
    }
  },

  deleteCommunity: async (id) => {
    try {
      await api.delete(`/community/communities/${id}`);
      set((state) => ({
        communities: state.communities.filter((c) => c.id !== id),
        activeCommunity: state.activeCommunity?.id === id ? null : state.activeCommunity,
      }));
    } catch (error) {
      console.error('Failed to delete community', error);
    }
  },

  archiveCommunity: async (id) => {
    try {
      await api.post(`/community/communities/${id}/archive`);
      set((state) => ({
        communities: state.communities.map((c) => (c.id === id ? { ...c, is_archived: !c.is_archived } : c)),
        activeCommunity: state.activeCommunity?.id === id ? { ...state.activeCommunity, is_archived: !state.activeCommunity.is_archived } : state.activeCommunity,
      }));
    } catch (error) {
      console.error('Failed to archive community', error);
    }
  },

  joinCommunity: async (id) => {
    try {
      const { data } = await api.post(`/community/communities/${id}/join`);
      if (data?.requested) {
        set((state) => ({
          communities: state.communities.map((c) => (c.id === id ? { ...c, my_request_status: 'pending' } : c)),
        }));
        return;
      }
      set((state) => ({
        communities: state.communities.map((c) => (c.id === id ? { ...c, member_count: c.member_count + 1, is_member: true, my_request_status: null } : c)),
      }));
    } catch (error) {
      console.error('Failed to join community', error);
    }
  },

  leaveCommunity: async (id) => {
    try {
      await api.post(`/community/communities/${id}/leave`);
      set((state) => ({
        communities: state.communities.map((c) => (c.id === id ? { ...c, member_count: Math.max(0, c.member_count - 1), is_member: false } : c)),
      }));
    } catch (error) {
      console.error('Failed to leave community', error);
    }
  },

  fetchCommunityMembers: async (id) => {
    try {
      const { data } = await api.get(`/community/communities/${id}/members`);
      set({ communityMembers: data.data || [] });
    } catch (error) {
      console.error('Failed to fetch community members', error);
    }
  },

  updateMemberRole: async (communityId, userId, role) => {
    try {
      const { data } = await api.put(`/community/communities/${communityId}/members/${userId}/role`, { role });
      set((state) => ({
        communityMembers: state.communityMembers.map((m) =>
          m.user_id === userId ? { ...m, role: data.data.role } : m
        ),
      }));
    } catch (error) {
      console.error('Failed to update member role', error);
    }
  },

  banMember: async (communityId, userId) => {
    try {
      await api.post(`/community/communities/${communityId}/members/${userId}/ban`);
      set((state) => ({
        communityMembers: state.communityMembers.map((m) =>
          m.user_id === userId ? { ...m, is_banned: true } : m
        ),
      }));
    } catch (error) {
      console.error('Failed to ban member', error);
    }
  },

  unbanMember: async (communityId, userId) => {
    try {
      await api.post(`/community/communities/${communityId}/members/${userId}/unban`);
      set((state) => ({
        communityMembers: state.communityMembers.map((m) =>
          m.user_id === userId ? { ...m, is_banned: false } : m
        ),
      }));
    } catch (error) {
      console.error('Failed to unban member', error);
    }
  },

  muteMember: async (communityId, userId) => {
    try {
      await api.post(`/community/communities/${communityId}/members/${userId}/mute`);
      set((state) => ({
        communityMembers: state.communityMembers.map((m) =>
          m.user_id === userId ? { ...m, is_muted: true } : m
        ),
      }));
    } catch (error) {
      console.error('Failed to mute member', error);
    }
  },

  unmuteMember: async (communityId, userId) => {
    try {
      await api.post(`/community/communities/${communityId}/members/${userId}/unmute`);
      set((state) => ({
        communityMembers: state.communityMembers.map((m) =>
          m.user_id === userId ? { ...m, is_muted: false } : m
        ),
      }));
    } catch (error) {
      console.error('Failed to unmute member', error);
    }
  },

  fetchCommunityRules: async (id) => {
    try {
      const { data } = await api.get(`/community/communities/${id}/rules`);
      set({ communityRules: data.data || [] });
    } catch (error) {
      console.error('Failed to fetch community rules', error);
    }
  },

  createCommunityRule: async (communityId, ruleData) => {
    try {
      const { data } = await api.post(`/community/communities/${communityId}/rules`, ruleData);
      set((state) => ({
        communityRules: [...state.communityRules, data.data],
      }));
    } catch (error) {
      console.error('Failed to create community rule', error);
    }
  },

  updateCommunityRule: async (communityId, ruleId, ruleData) => {
    try {
      const { data } = await api.put(`/community/communities/${communityId}/rules/${ruleId}`, ruleData);
      set((state) => ({
        communityRules: state.communityRules.map((r) => (r.id === ruleId ? { ...r, ...data.data } : r)),
      }));
    } catch (error) {
      console.error('Failed to update community rule', error);
    }
  },

  deleteCommunityRule: async (communityId, ruleId) => {
    try {
      await api.delete(`/community/communities/${communityId}/rules/${ruleId}`);
      set((state) => ({
        communityRules: state.communityRules.filter((r) => r.id !== ruleId),
      }));
    } catch (error) {
      console.error('Failed to delete community rule', error);
    }
  },

  fetchCommunityStats: async (id) => {
    try {
      const { data } = await api.get(`/community/communities/${id}/stats`);
      set({ communityStats: data.data || null });
    } catch (error) {
      console.error('Failed to fetch community stats', error);
    }
  },

  searchCommunities: async (query) => {
    if (!query.trim()) {
      const { data } = await api.get('/community/communities');
      set({ communities: data.data || [] });
      return;
    }
    try {
      const { data } = await api.get(`/community/communities/search?q=${encodeURIComponent(query)}`);
      set({ communities: data.data || [] });
    } catch (error) {
      console.error('Failed to search communities', error);
    }
  },

  setActiveCommunity: (community) => {
    set({ activeCommunity: community, communityMembers: [], communityRules: [], communityStats: null });
  },
}));
