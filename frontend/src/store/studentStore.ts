import { create } from 'zustand';
import api from '@/lib/axios';

export interface StudentStats {
  enrolledCourses: number;
  completedCourses: number;
  certificates: number;
  averageProgress: number;
  completedLessons: number;
  totalLearningHours: number;
  currentStreak: number;
  xpPoints: number;
  level: number;
  rank: number;
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
  lastLesson?: string;
  remainingLessons?: number;
  estimatedCompletion?: string;
}

export interface ActivityItem {
  type: 'enrollment' | 'certificate' | 'lesson' | 'assignment';
  course_title: string;
  created_at: string;
}

export interface UpcomingAssignment {
  id: string;
  title: string;
  due_date: string;
  max_score: number;
  course_title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
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

export interface RecommendedCourse {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  instructor_name: string;
  duration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  rating: number;
  studentCount: number;
  category: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earned_at?: string;
  progress?: number;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar: string | null;
  xpPoints: number;
  badges: number;
  rank: number;
  rankChange: number;
  isCurrentUser: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'live-class' | 'assignment' | 'quiz' | 'exam' | 'webinar';
  date: string;
  time: string;
  course_title: string;
}

export interface WeeklyActivity {
  day: string;
  hours: number;
}

export interface SkillGrowth {
  skill: string;
  current: number;
  previous: number;
}

export interface LearnerJourney {
  stats: StudentStats;
  recentCourses: RecentCourse[];
  recentActivity: ActivityItem[];
  upcomingAssignments: UpcomingAssignment[];
  weeklyActivity: WeeklyActivity[];
  monthlyLearning: { month: string; hours: number }[];
  skillGrowth: SkillGrowth[];
  recommendedCourses: RecommendedCourse[];
  badges: Badge[];
}

interface StudentState {
  stats: StudentStats | null;
  recentCourses: RecentCourse[];
  recentActivity: ActivityItem[];
  upcomingAssignments: UpcomingAssignment[];
  enrollments: EnrolledCourse[];
  assignments: Assignment[];
  notifications: Notification[];
  recommendedCourses: RecommendedCourse[];
  badges: Badge[];
  leaderboard: LeaderboardEntry[];
  calendarEvents: CalendarEvent[];
  weeklyActivity: WeeklyActivity[];
  monthlyLearning: { month: string; hours: number }[];
  skillGrowth: SkillGrowth[];
  searchResults: any[];
  isSearching: boolean;
  isLoading: boolean;
  error: string | null;
  unreadNotifications: number;

  fetchDashboard: () => Promise<void>;
  fetchEnrollments: () => Promise<void>;
  fetchAssignments: () => Promise<void>;
  submitAssignment: (assignmentId: string, fileUrl: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  fetchRecommendedCourses: () => Promise<void>;
  fetchBadges: () => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  fetchCalendarEvents: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;
  globalSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
}

export const useStudentStore = create<StudentState>((set, get) => ({
  stats: null,
  recentCourses: [],
  recentActivity: [],
  upcomingAssignments: [],
  enrollments: [],
  assignments: [],
  notifications: [],
  recommendedCourses: [],
  badges: [],
  leaderboard: [],
  calendarEvents: [],
  weeklyActivity: [],
  monthlyLearning: [],
  skillGrowth: [],
  searchResults: [],
  isSearching: false,
  isLoading: false,
  error: null,
  unreadNotifications: 0,

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const [dashboardRes, notificationsRes] = await Promise.all([
        api.get('/student/dashboard'),
        api.get('/notifications').catch(() => ({ data: { data: [] } })),
      ]);

      const data = dashboardRes.data.data;
      const notifs = notificationsRes.data.data || [];

      set({
        stats: {
          enrolledCourses: data.stats.enrolledCourses || 0,
          completedCourses: data.stats.completedCourses || 0,
          completedLessons: data.stats.completedLessons || 0,
          certificates: data.stats.certificates || 0,
          averageProgress: data.stats.averageProgress || 0,
          totalLearningHours: data.stats.totalLearningHours || 0,
          currentStreak: data.stats.currentStreak || 0,
          xpPoints: data.stats.xpPoints || 0,
          level: data.stats.level || 1,
          rank: data.stats.rank || 0,
        },
        recentCourses: data.recentCourses || [],
        recentActivity: data.recentActivity || [],
        upcomingAssignments: data.upcomingAssignments || [],
        notifications: notifs,
        unreadNotifications: notifs.filter((n: Notification) => !n.read).length,
        recommendedCourses: data.recommendedCourses || [],
        badges: data.badges || [],
        weeklyActivity: data.analytics?.weeklyActivity || [],
        monthlyLearning: data.analytics?.monthlyLearning || [],
        skillGrowth: data.analytics?.skillGrowth || [],
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
      set({
        notifications: data.data || [],
        unreadNotifications: (data.data || []).filter((n: Notification) => !n.read).length,
      });
    } catch (error: any) {
      console.error('Failed to fetch notifications', error);
    }
  },

  markNotificationRead: async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      const notifications = get().notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      );
      set({
        notifications,
        unreadNotifications: notifications.filter(n => !n.read).length,
      });
    } catch (error: any) {
      console.error('Failed to mark notification read', error);
    }
  },

  markAllNotificationsRead: async () => {
    try {
      await api.put('/notifications/read-all');
      set({
        notifications: get().notifications.map(n => ({ ...n, read: true })),
        unreadNotifications: 0,
      });
    } catch (error: any) {
      console.error('Failed to mark all read', error);
    }
  },

  fetchRecommendedCourses: async () => {
    try {
      const { data } = await api.get('/student/recommended');
      set({ recommendedCourses: data.data || [] });
    } catch {
      set({ recommendedCourses: [] });
    }
  },

  fetchBadges: async () => {
    try {
      const { data } = await api.get('/student/badges');
      set({ badges: data.data || [] });
    } catch {
      set({ badges: [] });
    }
  },

  fetchLeaderboard: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/student/leaderboard');
      set({ leaderboard: data.data || [], isLoading: false });
    } catch {
      set({ leaderboard: [], isLoading: false });
    }
  },

  fetchCalendarEvents: async () => {
    try {
      const { data } = await api.get('/student/calendar');
      set({ calendarEvents: data.data || [] });
    } catch {
      set({ calendarEvents: [] });
    }
  },

  fetchAnalytics: async () => {
    try {
      const { data } = await api.get('/student/analytics');
      set({
        weeklyActivity: data.data.weeklyActivity || [],
        monthlyLearning: data.data.monthlyLearning || [],
        skillGrowth: data.data.skillGrowth || [],
      });
    } catch {
      // Keep existing fallback data
    }
  },

  globalSearch: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [], isSearching: false });
      return;
    }
    set({ isSearching: true });
    try {
      const { data } = await api.get(`/search?q=${encodeURIComponent(query)}`);
      set({ searchResults: data.data || [], isSearching: false });
    } catch {
      set({
        searchResults: [],
        isSearching: false,
      });
    }
  },

  clearSearch: () => {
    set({ searchResults: [], isSearching: false });
  },
}));
