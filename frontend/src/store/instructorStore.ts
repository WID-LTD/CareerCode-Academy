import { create } from 'zustand';
import api from '@/lib/axios';
import { Course } from './courseStore';

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  completionRate: number;
  averageRating: string;
  certificatesIssued: number;
  totalWatchTime: number;
  monthlyRevenue: number;
  pendingReviews: number;
  upcomingLiveSessions: number;
  assignmentsToGrade: number;
  unreadMessages: number;
}

export interface TopCourse {
  id: string;
  title: string;
  slug: string;
  published: boolean;
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

export interface Review {
  id: string;
  courseId: string;
  courseTitle: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  createdAt: string;
  replied: boolean;
  reply?: string;
}

export interface Certificate {
  id: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  issueDate: string;
  verificationStatus: 'verified' | 'pending' | 'invalid';
  certificateUrl: string;
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  size: number;
  courseId: string;
  courseTitle: string;
  downloadCount: number;
  url: string;
  createdAt: string;
}

export interface Discussion {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  content: string;
  authorName: string;
  authorAvatar: string;
  repliesCount: number;
  isPinned: boolean;
  createdAt: string;
  lastActivity: string;
}

export interface Notification {
  id: string;
  type: 'enrollment' | 'review' | 'submission' | 'discussion' | 'live_class' | 'certificate';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface Program {
  id: string;
  title: string;
  slug: string;
  school: string;
  courseCount: number;
  studentCount: number;
}

interface InstructorState {
  stats: DashboardStats | null;
  topCourses: TopCourse[];
  recentActivity: RecentActivity[];
  myCourses: Course[];
  enrollmentTrend: { month: string; enrollments: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  coursePerformance: { course: string; students: number; rating: number; revenue: number }[];
  engagementData: { month: string; active: number; inactive: number }[];
  isLoading: boolean;
  error: string | null;

  analytics: any | null;
  submissions: any[];
  announcements: any[];
  liveClasses: any[];
  schedule: any[];
  courseProposals: any[];
  assignments: any[];
  assignmentSubmissions: Record<string, any[]>;

  reviews: Review[];
  certificates: Certificate[];
  resources: Resource[];
  discussions: Discussion[];
  notifications: Notification[];
  programs: Program[];

  fetchDashboardStats: () => Promise<void>;
  fetchMyCourses: () => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  publishCourse: (id: string) => Promise<void>;
  unpublishCourse: (id: string) => Promise<void>;
  archiveCourse: (id: string) => Promise<void>;
  duplicateCourse: (id: string) => Promise<void>;
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
  fetchAssignmentsByCourse: (courseId: string) => Promise<void>;
  createAssignment: (payload: any) => Promise<any>;
  updateAssignment: (id: string, payload: any) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;

  fetchReviews: () => Promise<void>;
  replyToReview: (id: string, reply: string) => Promise<void>;
  reportReview: (id: string) => Promise<void>;
  fetchCertificates: () => Promise<void>;
  reissueCertificate: (id: string) => Promise<void>;
  fetchResources: () => Promise<void>;
  uploadResource: (formData: FormData) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  fetchDiscussions: () => Promise<void>;
  createDiscussion: (data: any) => Promise<void>;
  pinDiscussion: (id: string, pinned: boolean) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  fetchPrograms: () => Promise<void>;
  fetchEarnings: () => Promise<any>;
  fetchWithdrawalHistory: () => Promise<any[]>;
}

export const useInstructorStore = create<InstructorState>((set, get) => ({
  stats: null,
  topCourses: [],
  recentActivity: [],
  myCourses: [],
  enrollmentTrend: [],
  monthlyRevenue: [],
  coursePerformance: [],
  engagementData: [],
  isLoading: false,
  error: null,

  analytics: null,
  submissions: [],
  announcements: [],
  liveClasses: [],
  schedule: [],
  courseProposals: [],
  assignments: [],
  assignmentSubmissions: {},

  reviews: [],
  certificates: [],
  resources: [],
  discussions: [],
  notifications: [],
  programs: [],

  fetchDashboardStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/instructor/dashboard/stats');
      set({
        stats: data.data.stats,
        topCourses: data.data.topCourses || [],
        recentActivity: data.data.recentActivity || [],
        enrollmentTrend: data.data.enrollmentTrend || [],
        monthlyRevenue: data.data.monthlyRevenue || [],
        coursePerformance: data.data.coursePerformance || [],
        engagementData: data.data.engagementData || [],
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

  publishCourse: async (id: string) => {
    try {
      await api.put(`/courses/${id}/publish`);
      set({
        myCourses: get().myCourses.map(c => c.id === id ? { ...c, published: true } : c)
      });
    } catch (error) {
      throw error;
    }
  },

  unpublishCourse: async (id: string) => {
    try {
      await api.put(`/courses/${id}/unpublish`);
      set({
        myCourses: get().myCourses.map(c => c.id === id ? { ...c, published: false } : c)
      });
    } catch (error) {
      throw error;
    }
  },

  archiveCourse: async (id: string) => {
    try {
      await api.put(`/courses/${id}/archive`);
      set({
        myCourses: get().myCourses.filter(c => c.id !== id)
      });
    } catch (error) {
      throw error;
    }
  },

  duplicateCourse: async (id: string) => {
    try {
      const { data } = await api.post(`/courses/${id}/duplicate`);
      set({
        myCourses: [...get().myCourses, data.data]
      });
    } catch (error) {
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
  },

  fetchAssignmentsByCourse: async (courseId: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/assignments/course/${courseId}`);
      set({ assignments: data.data || [], isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  createAssignment: async (payload: any) => {
    try {
      const { data } = await api.post('/assignments', payload);
      set({ assignments: [data.data, ...get().assignments] });
      return data.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  updateAssignment: async (id: string, payload: any) => {
    try {
      const { data } = await api.put(`/assignments/${id}`, payload);
      set({
        assignments: get().assignments.map(a =>
          a.id === id ? { ...a, ...data.data } : a
        )
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  deleteAssignment: async (id: string) => {
    try {
      await api.delete(`/assignments/${id}`);
      set({ assignments: get().assignments.filter(a => a.id !== id) });
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  fetchReviews: async () => {
    try {
      const { data } = await api.get('/instructor/reviews');
      set({ reviews: data.data || [] });
    } catch (error) {
      console.error(error);
    }
  },

  replyToReview: async (id: string, reply: string) => {
    try {
      await api.put(`/instructor/reviews/${id}/reply`, { reply });
      set({
        reviews: get().reviews.map(r =>
          r.id === id ? { ...r, replied: true, reply } : r
        )
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  reportReview: async (id: string) => {
    try {
      await api.put(`/instructor/reviews/${id}/report`);
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  fetchCertificates: async () => {
    try {
      const { data } = await api.get('/instructor/certificates');
      set({ certificates: data.data || [] });
    } catch (error) {
      console.error(error);
    }
  },

  reissueCertificate: async (id: string) => {
    try {
      await api.post(`/instructor/certificates/${id}/reissue`);
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  fetchResources: async () => {
    try {
      const { data } = await api.get('/instructor/resources');
      set({ resources: data.data || [] });
    } catch (error) {
      console.error(error);
    }
  },

  uploadResource: async (formData: FormData) => {
    try {
      const { data } = await api.post('/instructor/resources', formData, {
      });
      set({ resources: [data.data, ...get().resources] });
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  deleteResource: async (id: string) => {
    try {
      await api.delete(`/instructor/resources/${id}`);
      set({ resources: get().resources.filter(r => r.id !== id) });
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  fetchDiscussions: async () => {
    try {
      const { data } = await api.get('/instructor/discussions');
      set({ discussions: data.data || [] });
    } catch (error) {
      console.error(error);
    }
  },

  createDiscussion: async (payload: any) => {
    try {
      const { data } = await api.post('/instructor/discussions', payload);
      set({ discussions: [data.data, ...get().discussions] });
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  pinDiscussion: async (id: string, pinned: boolean) => {
    try {
      await api.put(`/instructor/discussions/${id}/pin`, { pinned });
      set({
        discussions: get().discussions.map(d =>
          d.id === id ? { ...d, isPinned: pinned } : d
        )
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  fetchNotifications: async () => {
    try {
      const { data } = await api.get('/instructor/notifications');
      set({ notifications: data.data || [] });
    } catch (error) {
      console.error(error);
    }
  },

  markNotificationRead: async (id: string) => {
    try {
      await api.put(`/instructor/notifications/${id}/read`);
      set({
        notifications: get().notifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        )
      });
    } catch (error) {
      console.error(error);
    }
  },

  markAllNotificationsRead: async () => {
    try {
      await api.put('/instructor/notifications/read-all');
      set({
        notifications: get().notifications.map(n => ({ ...n, read: true }))
      });
    } catch (error) {
      console.error(error);
    }
  },

  fetchPrograms: async () => {
    try {
      const { data } = await api.get('/instructor/programs');
      set({ programs: data.data || [] });
    } catch (error) {
      console.error(error);
    }
  },

  fetchEarnings: async () => {
    try {
      const { data } = await api.get('/instructor/earnings');
      return data.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  fetchWithdrawalHistory: async () => {
    try {
      const { data } = await api.get('/instructor/withdrawals');
      return data.data || [];
    } catch (error) {
      console.error(error);
      return [];
    }
  }
}));
