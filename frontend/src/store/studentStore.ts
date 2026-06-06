import { create } from 'zustand';
import api from '@/lib/axios';

export interface StudentStats {
  enrolledCourses: number;
  certificates: number;
  averageProgress: number;
  completedLessons: number;
}

export interface RecentCourse {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  duration: number;
  progress: number;
  instructor_name: string;
  enrolled_at: string;
}

export interface ActivityItem {
  type: 'enrollment' | 'certificate';
  course_title: string;
  created_at: string;
}

export interface UpcomingAssignment {
  id: string;
  title: string;
  due_date: string;
  max_score: number;
  course_title: string;
}

export interface EnrolledCourse {
  id: string;
  user_id: string;
  course_id: string;
  progress: number;
  completed_lessons: string[];
  completed: boolean;
  enrolled_at: string;
  completed_at: string | null;
  course_title: string;
  course_thumbnail: string | null;
  course_slug: string;
  category: string;
  instructor_name: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  course: string;
  due: string;
  status: 'not-started' | 'in-progress' | 'pending' | 'submitted' | 'graded';
  grade: string | null;
  feedback: string | null;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
}

interface StudentState {
  stats: StudentStats | null;
  recentCourses: RecentCourse[];
  recentActivity: ActivityItem[];
  upcomingAssignments: UpcomingAssignment[];
  enrollments: EnrolledCourse[];
  assignments: Assignment[];
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;

  fetchDashboard: () => Promise<void>;
  fetchEnrollments: () => Promise<void>;
  fetchAssignments: () => Promise<void>;
  submitAssignment: (assignmentId: string, fileUrl: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
}

export const useStudentStore = create<StudentState>((set, get) => ({
  stats: null,
  recentCourses: [],
  recentActivity: [],
  upcomingAssignments: [],
  enrollments: [],
  assignments: [],
  notifications: [],
  isLoading: false,
  error: null,

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/student/dashboard');
      set({
        stats: data.data.stats,
        recentCourses: data.data.recentCourses,
        recentActivity: data.data.recentActivity,
        upcomingAssignments: data.data.upcomingAssignments,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch dashboard',
      });
    }
  },

  fetchEnrollments: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/enrollments');
      set({ enrollments: data.data || [], isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch enrollments',
      });
    }
  },

  fetchAssignments: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/student/assignments');
      set({ assignments: data.data || [], isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch assignments',
      });
    }
  },

  submitAssignment: async (assignmentId: string, fileUrl: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/assignments/${assignmentId}/submit`, { fileUrl });
      get().fetchAssignments();
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to submit assignment',
      });
      throw error;
    }
  },

  fetchNotifications: async () => {
    try {
      const { data } = await api.get('/notifications');
      set({ notifications: data.data || [] });
    } catch (error: any) {
      console.error('Failed to fetch notifications', error);
    }
  },

  markNotificationRead: async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      set({
        notifications: get().notifications.map(n => 
          n.id === id ? { ...n, read: true } : n
        )
      });
    } catch (error: any) {
      console.error('Failed to mark notification read', error);
    }
  },
}));
