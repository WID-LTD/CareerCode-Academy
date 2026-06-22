import { create } from 'zustand';
import api from '@/lib/axios';
import { Course } from './courseStore';

export interface DashboardStats {
  activeCourses: number;
  totalStudents: number;
  totalRevenue: number;
  averageRating: string;
  pendingReviews: number;
  unreadMessages: number;
  upcomingLiveSessions: number;
  assignmentsToGrade: number;
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
  enrollmentTrend: { month: string; enrollments: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  isLoading: boolean;
  error: string | null;

  analytics: any | null;
  submissions: any[];
  announcements: any[];
  liveClasses: any[];
  schedule: any[];
  courseProposals: any[];

  fetchDashboardStats: () => Promise<void>;
  fetchMyCourses: () => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  fetchCourseProposals: () => Promise<void>;
  createCourseProposal: (data: any) => Promise<void>;
  fetchAnalytics: () => Promise<void>;
  fetchSubmissions: () => Promise<void>;
  gradeSubmission: (id: string, score: number, feedback: string) => Promise<void>;
  fetchAnnouncements: () => Promise<void>;
  createAnnouncement: (data: any) => Promise<void>;
  fetchLiveClasses: () => Promise<void>;
  createLiveClass: (data: any) => Promise<void>;
  fetchSchedule: () => Promise<void>;
}

export const useInstructorStore = create<InstructorState>((set, get) => ({
  stats: null,
  topCourses: [],
  recentActivity: [],
  myCourses: [],
  enrollmentTrend: [],
  monthlyRevenue: [],
  isLoading: false,
  error: null,

  analytics: null,
  submissions: [],
  announcements: [],
  liveClasses: [],
  schedule: [],
  courseProposals: [],

  fetchDashboardStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/instructor/dashboard/stats');
      set({
        stats: data.data.stats,
        topCourses: data.data.topCourses,
        recentActivity: data.data.recentActivity,
        enrollmentTrend: data.data.enrollmentTrend || [],
        monthlyRevenue: data.data.monthlyRevenue || [],
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
  },

  fetchCourseProposals: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/instructor/course-proposals');
      set({ courseProposals: data.data || [], isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  createCourseProposal: async (payload: any) => {
    try {
      const { data } = await api.post('/instructor/course-proposals', payload);
      set({ courseProposals: [data.data, ...get().courseProposals] });
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  fetchAnalytics: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/instructor/analytics');
      set({ analytics: data.data, isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  fetchSubmissions: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/instructor/submissions');
      set({ submissions: data.data || [], isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  gradeSubmission: async (id: string, score: number, feedback: string) => {
    try {
      await api.put(`/instructor/submissions/${id}/grade`, { score, feedback });
      set({
        submissions: get().submissions.map(s =>
          s.id === id ? { ...s, score, feedback } : s
        )
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  fetchAnnouncements: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/instructor/announcements');
      set({ announcements: data.data || [], isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  createAnnouncement: async (payload: any) => {
    try {
      const { data } = await api.post('/instructor/announcements', payload);
      set({ announcements: [data.data, ...get().announcements] });
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  fetchLiveClasses: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/instructor/live-classes');
      set({ liveClasses: data.data || [], isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  createLiveClass: async (payload: any) => {
    try {
      const { data } = await api.post('/instructor/live-classes', payload);
      set({ liveClasses: [...get().liveClasses, data.data] });
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  fetchSchedule: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/instructor/schedule');
      set({ schedule: data.data || [], isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  }
}));
