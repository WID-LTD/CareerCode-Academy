import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/axios';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin' | 'super_admin';
  avatar?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  github?: string | null;
  twitter?: string | null;
  isVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  fetchUser: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      initialized: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          const userData = data.data;
          set({
            user: {
              id: userData.userId,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              avatar: userData.avatar,
              isVerified: userData.isVerified,
            },
            token: userData.token,
            refreshToken: userData.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (name, email, password, role) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', { name, email, password, role });
          const userData = data.data;
          set({
            user: {
              id: userData.userId,
              name: userData.name,
              email: userData.email,
              role: userData.role,
            },
            token: userData.token,
            refreshToken: userData.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          const currentRefreshToken = get().refreshToken;
          await api.post('/auth/logout', { refreshToken: currentRefreshToken });
        } catch { }
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      updateProfile: async (profileData) => {
        try {
          const { data } = await api.put('/auth/profile', profileData);
          const userData = data.data;
          set({
            user: {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              avatar: userData.avatar,
              bio: userData.bio,
              isVerified: userData.is_verified,
              createdAt: userData.created_at,
              updatedAt: userData.updated_at,
            },
          });
        } catch (error) {
          throw error;
        }
      },

      fetchUser: async () => {
        try {
          const { data } = await api.get('/auth/me');
          const userData = data.data;
          set({
            user: {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              avatar: userData.avatar,
              bio: userData.bio,
              isVerified: userData.is_verified,
              createdAt: userData.created_at,
              updatedAt: userData.updated_at,
            },
            isAuthenticated: true,
          });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },

      initialize: async () => {
        if (get().initialized) return;
        set({ isLoading: true });
        try {
          const { data } = await api.get('/auth/me');
          const userData = data.data;
          set({
            user: {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              avatar: userData.avatar,
              bio: userData.bio,
              isVerified: userData.is_verified,
              createdAt: userData.created_at,
              updatedAt: userData.updated_at,
            },
            isAuthenticated: true,
            initialized: true,
            isLoading: false,
          });
        } catch {
          set({ initialized: true, user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'careercode-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
