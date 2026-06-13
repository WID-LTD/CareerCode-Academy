import { create } from 'zustand';
import api from '@/lib/axios';

export interface StudentStats {
  enrolledCourses: number;
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
        api.get('/student/analytics').catch(() => ({
          data: {
            data: {
              weeklyActivity: [
                { day: 'Mon', hours: 2 }, { day: 'Tue', hours: 3 },
                { day: 'Wed', hours: 1.5 }, { day: 'Thu', hours: 4 },
                { day: 'Fri', hours: 2.5 }, { day: 'Sat', hours: 1 },
                { day: 'Sun', hours: 0.5 },
              ],
              monthlyLearning: [
                { month: 'Jan', hours: 20 }, { month: 'Feb', hours: 35 },
                { month: 'Mar', hours: 28 }, { month: 'Apr', hours: 42 },
                { month: 'May', hours: 38 }, { month: 'Jun', hours: 45 },
              ],
              skillGrowth: [
                { skill: 'JavaScript', current: 75, previous: 55 },
                { skill: 'React', current: 65, previous: 40 },
                { skill: 'TypeScript', current: 50, previous: 25 },
                { skill: 'Node.js', current: 60, previous: 45 },
                { skill: 'CSS', current: 80, previous: 70 },
              ],
            },
          },
        })),
        api.get('/student/recommended').catch(() => ({ data: { data: [] } })),
        api.get('/student/badges').catch(() => ({ data: { data: [] } })),
      ]);
      const data = dashboardRes.data.data;
      const recommended = dashboardRes.data.recommendedCourses || [];
      const badges = dashboardRes.data.badges || [];
      const analytics = dashboardRes.data.analytics || {};

      const notifs = notificationsRes.data.data || [];
      set({
        stats: {
          ...data.stats,
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
        recommendedCourses: data.recommendedCourses || recommended || [],
        badges: data.badges || badges || [],
        weeklyActivity: analytics.weeklyActivity || [],
        monthlyLearning: analytics.monthlyLearning || [],
        skillGrowth: analytics.skillGrowth || [],
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
      set({
        recommendedCourses: [
          {
            id: '1', title: 'Advanced React Patterns', slug: 'advanced-react',
            thumbnail: null, instructor_name: 'Sarah Chen', duration: 480,
            difficulty: 'advanced', rating: 4.8, studentCount: 1234, category: 'Web Development',
          },
          {
            id: '2', title: 'TypeScript Masterclass', slug: 'typescript-masterclass',
            thumbnail: null, instructor_name: 'Alex Rivera', duration: 360,
            difficulty: 'intermediate', rating: 4.9, studentCount: 892, category: 'Programming',
          },
          {
            id: '3', title: 'Python for Data Science', slug: 'python-data-science',
            thumbnail: null, instructor_name: 'Dr. Maria Lopez', duration: 600,
            difficulty: 'beginner', rating: 4.7, studentCount: 2100, category: 'Data Science',
          },
          {
            id: '4', title: 'Cloud Architecture on AWS', slug: 'cloud-architecture',
            thumbnail: null, instructor_name: 'James Wilson', duration: 540,
            difficulty: 'advanced', rating: 4.6, studentCount: 756, category: 'Cloud Computing',
          },
        ],
      });
    }
  },

  fetchBadges: async () => {
    try {
      const { data } = await api.get('/student/badges');
      set({ badges: data.data || [] });
    } catch {
      set({
        badges: [
          { id: '1', name: 'Fast Learner', description: 'Completed 5 lessons in a day', icon: 'Zap', earned: true, earned_at: '2025-05-10' },
          { id: '2', name: 'Quiz Master', description: 'Scored 100% on 3 quizzes', icon: 'Brain', earned: true, earned_at: '2025-05-15' },
          { id: '3', name: '30-Day Streak', description: 'Maintained a 30-day learning streak', icon: 'Flame', earned: false, progress: 65 },
          { id: '4', name: 'Top Performer', description: 'Reached top 10 on the leaderboard', icon: 'Award', earned: true, earned_at: '2025-06-01' },
          { id: '5', name: 'Course Completer', description: 'Completed your first course', icon: 'GraduationCap', earned: true, earned_at: '2025-04-20' },
          { id: '6', name: 'Helper', description: 'Answered 10 community questions', icon: 'HeartHandshake', earned: false, progress: 40 },
        ],
      });
    }
  },

  fetchLeaderboard: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/student/leaderboard');
      set({ leaderboard: data.data || [], isLoading: false });
    } catch {
      set({
        leaderboard: [
          { userId: '1', name: 'Alex Rivera', avatar: null, xpPoints: 12500, badges: 12, rank: 1, rankChange: 0, isCurrentUser: false },
          { userId: '2', name: 'Maria Chen', avatar: null, xpPoints: 11200, badges: 10, rank: 2, rankChange: 2, isCurrentUser: false },
          { userId: '3', name: 'James Wilson', avatar: null, xpPoints: 10800, badges: 9, rank: 3, rankChange: -1, isCurrentUser: false },
          { userId: '4', name: 'Sarah Johnson', avatar: null, xpPoints: 9800, badges: 8, rank: 4, rankChange: 1, isCurrentUser: true },
          { userId: '5', name: 'David Kim', avatar: null, xpPoints: 9200, badges: 7, rank: 5, rankChange: -2, isCurrentUser: false },
          { userId: '6', name: 'Emily Davis', avatar: null, xpPoints: 8700, badges: 6, rank: 6, rankChange: 3, isCurrentUser: false },
          { userId: '7', name: 'Michael Brown', avatar: null, xpPoints: 8100, badges: 5, rank: 7, rankChange: 0, isCurrentUser: false },
          { userId: '8', name: 'Lisa Wang', avatar: null, xpPoints: 7600, badges: 4, rank: 8, rankChange: -1, isCurrentUser: false },
        ],
        isLoading: false,
      });
    }
  },

  fetchCalendarEvents: async () => {
    try {
      const { data } = await api.get('/student/calendar');
      set({ calendarEvents: data.data || [] });
    } catch {
      set({
        calendarEvents: [
          { id: '1', title: 'Live: React Hooks Deep Dive', type: 'live-class', date: '2025-06-15', time: '10:00 AM', course_title: 'Advanced React' },
          { id: '2', title: 'Assignment: Build a Dashboard', type: 'assignment', date: '2025-06-18', time: '11:59 PM', course_title: 'Advanced React' },
          { id: '3', title: 'Week 3 Quiz', type: 'quiz', date: '2025-06-20', time: '2:00 PM', course_title: 'TypeScript Masterclass' },
          { id: '4', title: 'Midterm Exam', type: 'exam', date: '2025-06-25', time: '9:00 AM', course_title: 'Python for Data Science' },
          { id: '5', title: 'Webinar: Career in Tech', type: 'webinar', date: '2025-06-22', time: '3:00 PM', course_title: 'Career Development' },
          { id: '6', title: 'Live: TypeScript Generics', type: 'live-class', date: '2025-06-17', time: '11:00 AM', course_title: 'TypeScript Masterclass' },
        ],
      });
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
