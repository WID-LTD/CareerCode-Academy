import { create } from 'zustand';
import api from '@/lib/axios';

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string;
  video_url?: string;
  duration: number;
  order_index: number;
  is_free: boolean;
}

export interface Review {
  id: string;
  user_id: string;
  user_name?: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Promotion {
  id: string;
  title: string;
  description?: string | null;
  slug?: string | null;
  discount_percent: number;
  scope: 'all' | 'category' | 'course';
  category_id?: string | null;
  course_id?: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string | null;
  price: number;
  discount_percentage: number;
  category: string;
  instructor_id: string;
  instructor_name?: string;
  instructor_avatar?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  published: boolean;
  slug: string;
  created_at: string;
  updated_at: string;
  
  // Active promotion (decorated server-side) — discounts only come from promotions
  promotion?: Promotion | null;
  effective_price?: number;
  
  learningOutcomes?: string[];
  
  // Detail fields
  lessons?: Lesson[];
  reviews?: Review[];
  averageRating?: number;
  enrollmentCount?: number;
  student_count?: number;
  avg_rating?: number;
  
  // Program/School fields
  program_id?: string;
  program_name?: string;
  program_slug?: string;
  program_icon?: string;
  school_name?: string;
  school_slug?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface CourseState {
  courses: Course[];
  currentCourse: Course | null;
  isLoading: boolean;
  error: string | null;
  pagination: PaginationInfo;
  
  fetchCourses: (filters?: { category?: string; categories?: string[]; level?: string; page?: number; limit?: number; sort?: string }) => Promise<void>;
  fetchCourseBySlug: (slug: string) => Promise<void>;
  enrollCourse: (courseId: string) => Promise<void>;
  unenrollCourse: (courseId: string) => Promise<void>;
  initializePayment: (courseId: string, provider?: string) => Promise<string>;
}

export const useCourseStore = create<CourseState>((set) => ({
  courses: [],
  currentCourse: null,
  isLoading: false,
  error: null,
  pagination: { page: 1, limit: 50, total: 0, pages: 0 },

  fetchCourses: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.categories?.length) {
        params.append('categories', filters.categories.join(','));
      } else if (filters.category && filters.category !== 'All') {
        params.append('category', filters.category);
      }
      if (filters.level && filters.level !== 'All Levels') {
        params.append('level', filters.level.toLowerCase());
      }
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.sort) params.append('sort', filters.sort);
      
      const { data } = await api.get(`/courses?${params.toString()}`);
      set({ 
        courses: data.data || [], 
        isLoading: false,
        pagination: data.pagination || { page: 1, limit: 50, total: 0, pages: 0 },
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch courses' 
      });
    }
  },

  fetchCourseBySlug: async (slug: string) => {
    set({ isLoading: true, error: null, currentCourse: null });
    try {
      const { data } = await api.get(`/courses/slug/${slug}`);
      set({ currentCourse: data.data, isLoading: false });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch course details' 
      });
    }
  },

  enrollCourse: async (courseId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/courses/${courseId}/enroll`);
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to enroll in course' 
      });
      throw error;
    }
  },

  unenrollCourse: async (courseId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/courses/${courseId}/enroll`);
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to un-enroll from course' 
      });
      throw error;
    }
  },

  initializePayment: async (courseId: string, provider = 'paystack') => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post(`/payments/initialize`, {
        courseId,
        provider,
      });
      set({ isLoading: false });
      return data.data.authorizationUrl;
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to initialize payment' 
      });
      throw error;
    }
  }
}));
