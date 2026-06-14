import { create } from 'zustand';
import api from '@/lib/axios';

interface ExtendedState {
  analytics: any | null;
  submissions: any[];
  announcements: any[];
  liveClasses: any[];
  schedule: any[];
  courseProposals: any[];
  isLoading: boolean;

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

export const useInstructorExtendedStore = create<ExtendedState>((set, get) => ({
  analytics: null,
  submissions: [],
  announcements: [],
  liveClasses: [],
  schedule: [],
  courseProposals: [],
  isLoading: false,

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
      // update local
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

