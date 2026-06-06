import { create } from 'zustand';
import api from '@/lib/axios';
import { Course } from './courseStore';

export interface DashboardStats {
  activeCourses: number;
  totalStudents: number;
  totalRevenue: number;
  averageRating: string;
}

export interface TopCourse {
  title: string;
  students: number;
  rating: string;
  revenue: number;
}

export interface RecentActivity {
  action: string;
  details: string;
  time: string;
  type: 'enrollment' | 'submission' | 'review' | 'question';
}

interface InstructorState {
  stats: DashboardStats | null;
  topCourses: TopCourse[];
  recentActivity: RecentActivity[];
  myCourses: Course[];
  isLoading: boolean;
  error: string | null;
  
  fetchDashboardStats: () => Promise<void>;
  fetchMyCourses: () => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
}

export const useInstructorStore = create<InstructorState>((set, get) => ({
  stats: null,
  topCourses: [],
  recentActivity: [],
  myCourses: [],
  isLoading: false,
  error: null,

  fetchDashboardStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/instructor/dashboard/stats');
      set({ 
        stats: data.data.stats,
        topCourses: data.data.topCourses,
        recentActivity: data.data.recentActivity,
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch dashboard stats' 
      });
    }
  },

  fetchMyCourses: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/courses/instructor');
      set({ myCourses: data.data || [], isLoading: false });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch your courses' 
      });
    }
  },

  deleteCourse: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/courses/${id}`);
      set({ 
        myCourses: get().myCourses.filter(course => course.id !== id),
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to delete course' 
      });
      throw error;
    }
  }
}));
