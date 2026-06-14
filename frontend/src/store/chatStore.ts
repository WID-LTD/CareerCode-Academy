import { create } from 'zustand';
import api from '@/lib/axios';
import { io, Socket } from 'socket.io-client';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface ConversationUser {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  unread_count?: number;
  last_message?: string;
  last_message_at?: string;
}

interface ChatState {
  socket: Socket | null;
  conversations: ConversationUser[];
  activeConversation: string | null;
  messages: Message[];
  isLoading: boolean;
  apiPrefix: string;
  onlineUsers: Set<string>;
  typingUsers: Set<string>;

  setApiPrefix: (prefix: string) => void;
  initializeSocket: (userId: string) => void;
  disconnectSocket: () => void;
  fetchConversations: () => Promise<void>;
  setActiveConversation: (userId: string) => Promise<void>;
  sendMessage: (receiverId: string, content: string) => Promise<void>;
  addMessage: (message: Message) => void;
  deleteMessage: (messageId: string) => Promise<void>;
  markAsRead: (senderId: string) => Promise<void>;
  emitTyping: (receiverId: string, typing: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoading: false,
  apiPrefix: '/instructor',
  onlineUsers: new Set(),
  typingUsers: new Set(),

  setApiPrefix: (prefix: string) => set({ apiPrefix: prefix }),

  initializeSocket: (userId: string) => {
    let { socket } = get();
    if (!socket) {
      const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';
      socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

      socket.on('connect', () => {
        socket!.emit('join_room', userId);
      });

      socket.on('receive_message', (message: Message) => {
        get().addMessage(message);
        get().fetchConversations();
      });

      socket.on('online_users', (data: { count: number; users: { id: string }[] }) => {
        set({ onlineUsers: new Set(data.users.map(u => u.id)) });
      });

      socket.on('user_typing', (data: { senderId: string; typing: boolean }) => {
        set((state) => {
          const next = new Set(state.typingUsers);
          if (data.typing) next.add(data.senderId);
          else next.delete(data.senderId);
          return { typingUsers: next };
        });
      });

      set({ socket });
    }
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, onlineUsers: new Set(), typingUsers: new Set() });
    }
  },

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const prefix = get().apiPrefix;
      const { data } = await api.get(`${prefix}/messages/conversations`);
      set({ conversations: data.data, isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  setActiveConversation: async (userId: string) => {
    set({ activeConversation: userId, isLoading: true, messages: [] });
    try {
      const prefix = get().apiPrefix;
      const { data } = await api.get(`${prefix}/messages/${userId}`);
      set({ messages: data.data, isLoading: false });
      get().markAsRead(userId);
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  sendMessage: async (receiverId: string, content: string) => {
    try {
      const prefix = get().apiPrefix;
      const { data } = await api.post(`${prefix}/messages`, { receiver_id: receiverId, content });
      get().addMessage(data.data);
      get().emitTyping(receiverId, false);
    } catch (error) {
      console.error(error);
    }
  },

  addMessage: (message: Message) => {
    const { messages, activeConversation } = get();
    if (
      (message.sender_id === activeConversation) ||
      (message.receiver_id === activeConversation)
    ) {
      set({ messages: [...messages, message] });
    }
  },

  deleteMessage: async (messageId: string) => {
    try {
      const prefix = get().apiPrefix;
      await api.delete(`${prefix}/messages/${messageId}`);
      set({ messages: get().messages.filter(m => m.id !== messageId) });
    } catch (error) {
      console.error(error);
    }
  },

  markAsRead: async (senderId: string) => {
    try {
      const prefix = get().apiPrefix;
      await api.put(`${prefix}/messages/read`, { senderId });
      set((state) => ({
        conversations: state.conversations.map(c =>
          c.id === senderId ? { ...c, unread_count: 0 } : c
        ),
      }));
    } catch (error) {
      console.error(error);
    }
  },

  emitTyping: (receiverId: string, typing: boolean) => {
    const { socket } = get();
    if (!socket) return;
    const event = typing ? 'typing' : 'stop_typing';
    socket.emit(event, { receiverId, senderId: '' });
  },
}));
