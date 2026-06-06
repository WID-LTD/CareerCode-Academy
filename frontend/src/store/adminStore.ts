import { create } from 'zustand';
import api from '@/lib/axios';

export interface AdminStats {
  totalStudents: number;
  totalInstructors: number;
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  averagePrice: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin' | 'super_admin';
  avatar: string | null;
  bio: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface AdminCourse {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  price: number;
  category: string;
  instructor_id: string;
  instructor_name?: string;
  level: string;
  duration: number;
  published: boolean;
  slug: string;
  created_at: string;
}

export interface AdminPayment {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  course_id: string;
  course_title: string;
  amount: number;
  currency: string;
  provider: string;
  reference: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
}

interface AdminState {
  stats: AdminStats | null;
  users: AdminUser[];
  courses: AdminCourse[];
  payments: AdminPayment[];
  recentUsers: AdminUser[];
  recentPayments: AdminPayment[];
  monthlyRevenue: any[];
  isLoading: boolean;
  error: string | null;

  usersPagination: { page: number; limit: number; total: number; pages: number } | null;
  coursesPagination: { page: number; limit: number; total: number; pages: number } | null;
  paymentsPagination: { page: number; limit: number; total: number; pages: number } | null;

  fetchDashboardData: () => Promise<void>;
  fetchUsers: (page?: number, limit?: number) => Promise<void>;
  fetchCourses: (page?: number, limit?: number) => Promise<void>;
  fetchPayments: (page?: number, limit?: number) => Promise<void>;
  updateUserRole: (id: string, role: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  stats: null,
  users: [],
  courses: [],
  payments: [],
  recentUsers: [],
  recentPayments: [],
  monthlyRevenue: [],
  isLoading: false,
  error: null,

  usersPagination: null,
  coursesPagination: null,
  paymentsPagination: null,

  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/admin/dashboard');
      set({
        stats: data.data.stats,
        recentUsers: data.data.recentUsers,
        recentPayments: data.data.recentPayments,
        monthlyRevenue: data.data.monthlyRevenue,
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to fetch dashboard stats' });
    }
  },

  fetchUsers: async (page = 1, limit = 50) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/admin/users?page=${page}&limit=${limit}`);
      set({
        users: data.data,
        usersPagination: data.pagination,
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to fetch users' });
    }
  },

  fetchCourses: async (page = 1, limit = 50) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/admin/courses?page=${page}&limit=${limit}`);
      set({
        courses: data.data,
        coursesPagination: data.pagination,
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to fetch courses' });
    }
  },

  fetchPayments: async (page = 1, limit = 50) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/admin/payments?page=${page}&limit=${limit}`);
      set({
        payments: data.data,
        paymentsPagination: data.pagination,
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to fetch transaction logs' });
    }
  },

  updateUserRole: async (id, role) => {
    try {
      await api.put(`/admin/users/${id}/role`, { role });
      // Refresh user list
      get().fetchUsers(get().usersPagination?.page || 1);
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update user role' });
      throw error;
    }
  },

  deleteUser: async (id) => {
    try {
      await api.delete(`/admin/users/${id}`);
      set({ users: get().users.filter(u => u.id !== id) });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete user' });
      throw error;
    }
  },

  deleteCourse: async (id) => {
    try {
      await api.delete(`/admin/courses/${id}`);
      set({ courses: get().courses.filter(c => c.id !== id) });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete course' });
      throw error;
    }
  },
}));
