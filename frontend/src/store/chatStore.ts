import { create } from 'zustand';
import api from '@/lib/axios';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './authStore';

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
}

interface ChatState {
  socket: Socket | null;
  conversations: ConversationUser[];
  activeConversation: string | null;
  messages: Message[];
  isLoading: boolean;
  apiPrefix: string;

  setApiPrefix: (prefix: string) => void;
  initializeSocket: (userId: string) => void;
  disconnectSocket: () => void;
  fetchConversations: () => Promise<void>;
  setActiveConversation: (userId: string) => Promise<void>;
  sendMessage: (receiverId: string, content: string) => Promise<void>;
  addMessage: (message: Message) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoading: false,
  apiPrefix: '/instructor',

  setApiPrefix: (prefix: string) => set({ apiPrefix: prefix }),

  initializeSocket: (userId: string) => {
    let { socket } = get();
    if (!socket) {
      const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3000';
      socket = io(SOCKET_URL, {
        withCredentials: true
      });
      
      socket.on('connect', () => {
        socket!.emit('join_room', userId);
      });

      socket.on('receive_message', (message: Message) => {
        get().addMessage(message);
      });

      set({ socket });
    }
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
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
    } catch (error) {
      console.error(error);
    }
  },

  addMessage: (message: Message) => {
    const { messages, activeConversation } = get();
    // Only add to current view if it belongs to the active conversation
    if (
      (message.sender_id === activeConversation) || 
      (message.receiver_id === activeConversation)
    ) {
      set({ messages: [...messages, message] });
    }
  }
}));
