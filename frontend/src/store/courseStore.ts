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
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string | null;
  price: number;
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
  
  learningOutcomes?: string[];
  
  // Detail fields
  lessons?: Lesson[];
  reviews?: Review[];
  averageRating?: number;
  enrollmentCount?: number;
}

interface CourseState {
  courses: Course[];
  currentCourse: Course | null;
  isLoading: boolean;
  error: string | null;
  
  fetchCourses: (filters?: { category?: string; level?: string }) => Promise<void>;
  fetchCourseBySlug: (slug: string) => Promise<void>;
  enrollCourse: (courseId: string) => Promise<void>;
  initializePayment: (courseId: string, provider?: string) => Promise<string>;
}

export const useCourseStore = create<CourseState>((set) => ({
  courses: [],
  currentCourse: null,
  isLoading: false,
  error: null,

  fetchCourses: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'All') {
        params.append('category', filters.category);
      }
      if (filters.level && filters.level !== 'All Levels') {
        params.append('level', filters.level.toLowerCase());
      }
      
      const { data } = await api.get(`/courses?${params.toString()}`);
      set({ courses: data.data || [], isLoading: false });
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
