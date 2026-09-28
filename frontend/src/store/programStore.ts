import { create } from 'zustand';
import toast from 'react-hot-toast';
import api from '@/lib/axios';

export type ProgramStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'archived';

export interface ProgramCourseLink {
  course_id: string;
  course_title?: string;
  week_number: number;
  required: boolean;
  order_index: number;
}

export interface ProgramCohort {
  id?: string;
  title: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
}

export interface Program {
  id: string;
  school_id?: string;
  school_name?: string;
  school_slug?: string;
  name: string;
  title?: string;
  slug: string;
  description?: string;
  duration_weeks?: number;
  duration?: string;
  price?: number;
  currency?: string;
  thumbnail_url?: string;
  thumbnail?: string;
  status: ProgramStatus;
  courses?: ProgramCourseLink[];
  cohorts?: ProgramCohort[];
  career_outcomes?: string[];
  rejection_reason?: string | null;
  updated_at?: string;
  created_at?: string;
}

export interface ProgramPayload {
  school_id: string;
  name: string;
  slug?: string;
  description?: string;
  duration_weeks?: number;
  price?: number;
  currency?: string;
  thumbnail_url?: string;
  courses?: ProgramCourseLink[];
  cohorts?: ProgramCohort[];
  career_outcomes?: string[];
}

interface ProgramState {
  programs: Program[];
  currentProgram: Program | null;
  isLoading: boolean;
  error: string | null;

  fetchPrograms: (filters?: { status?: string; school_id?: string }) => Promise<void>;
  fetchProgram: (id: string) => Promise<void>;
  createProgram: (payload: ProgramPayload) => Promise<Program | null>;
  updateProgram: (id: string, payload: Partial<ProgramPayload>) => Promise<Program | null>;
  submitProgram: (id: string) => Promise<void>;
  approveProgram: (id: string) => Promise<void>;
  rejectProgram: (id: string, reason: string) => Promise<void>;
  archiveProgram: (id: string) => Promise<void>;
  fetchCohorts: (id: string) => Promise<ProgramCohort[]>;
  createCohort: (id: string, cohort: ProgramCohort) => Promise<void>;
  clearCurrent: () => void;
}

function friendlyError(error: any, fallback: string): string {
  const status = error?.response?.status;
  if (status === 404) return 'Program endpoint not found — the backend for this feature is not deployed yet.';
  if (status === 501) return 'Program management is not implemented on the server yet. Please try again later.';
  return error?.response?.data?.message || fallback;
}

export const useProgramStore = create<ProgramState>((set, get) => ({
  programs: [],
  currentProgram: null,
  isLoading: false,
  error: null,

  fetchPrograms: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.school_id) params.append('school_id', filters.school_id);
      const query = params.toString();
      const { data } = await api.get(`/programs${query ? `?${query}` : ''}`);
      set({ programs: data.data || [], isLoading: false });
    } catch (error: any) {
      const message = friendlyError(error, 'Failed to fetch programs');
      set({ isLoading: false, error: message });
      toast.error(message);
    }
  },

  fetchProgram: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/programs/${id}`);
      set({ currentProgram: data.data, isLoading: false });
    } catch (error: any) {
      const message = friendlyError(error, 'Failed to fetch program');
      set({ isLoading: false, error: message });
      toast.error(message);
    }
  },

  createProgram: async (payload: ProgramPayload) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/programs', payload);
      const created = data.data as Program;
      set({ programs: [created, ...get().programs], currentProgram: created, isLoading: false });
      toast.success('Program created');
      return created;
    } catch (error: any) {
      const message = friendlyError(error, 'Failed to create program');
      set({ isLoading: false, error: message });
      toast.error(message);
      return null;
    }
  },

  updateProgram: async (id: string, payload: Partial<ProgramPayload>) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.put(`/programs/${id}`, payload);
      const updated = data.data as Program;
      set({
        programs: get().programs.map((p) => (p.id === id ? { ...p, ...updated } : p)),
        currentProgram: updated,
        isLoading: false,
      });
      toast.success('Program updated');
      return updated;
    } catch (error: any) {
      const message = friendlyError(error, 'Failed to update program');
      set({ isLoading: false, error: message });
      toast.error(message);
      return null;
    }
  },

  submitProgram: async (id: string) => {
    try {
      const { data } = await api.post(`/programs/${id}/submit`);
      const updated = (data.data || { status: 'pending_review' }) as Partial<Program>;
      set({
        programs: get().programs.map((p) => (p.id === id ? { ...p, ...updated, status: 'pending_review' as ProgramStatus } : p)),
      });
      toast.success('Program submitted for review');
    } catch (error: any) {
      const message = friendlyError(error, 'Failed to submit program');
      toast.error(message);
      throw error;
    }
  },

  approveProgram: async (id: string) => {
    try {
      const { data } = await api.post(`/programs/${id}/approve`);
      const updated = (data.data || { status: 'published' }) as Partial<Program>;
      set({
        programs: get().programs.map((p) => (p.id === id ? { ...p, ...updated, status: 'published' as ProgramStatus } : p)),
      });
      toast.success('Program approved');
    } catch (error: any) {
      const message = friendlyError(error, 'Failed to approve program');
      toast.error(message);
      throw error;
    }
  },

  rejectProgram: async (id: string, reason: string) => {
    try {
      const { data } = await api.post(`/programs/${id}/reject`, { reason });
      const updated = (data.data || { status: 'rejected', rejection_reason: reason }) as Partial<Program>;
      set({
        programs: get().programs.map((p) =>
          p.id === id ? { ...p, ...updated, status: 'rejected' as ProgramStatus, rejection_reason: reason } : p,
        ),
      });
      toast.success('Program rejected');
    } catch (error: any) {
      const message = friendlyError(error, 'Failed to reject program');
      toast.error(message);
      throw error;
    }
  },

  archiveProgram: async (id: string) => {
    try {
      const { data } = await api.put(`/programs/${id}`, { status: 'archived' }).catch(() => ({ data: { data: null } }));
      const updated = ((data as any)?.data || { status: 'archived' }) as Partial<Program>;
      set({
        programs: get().programs.map((p) => (p.id === id ? { ...p, ...updated, status: 'archived' as ProgramStatus } : p)),
      });
      toast.success('Program archived');
    } catch (error: any) {
      const message = friendlyError(error, 'Failed to archive program');
      toast.error(message);
      throw error;
    }
  },

  fetchCohorts: async (id: string) => {
    try {
      const { data } = await api.get(`/programs/${id}/cohorts`);
      return data.data || [];
    } catch (error: any) {
      const message = friendlyError(error, 'Failed to fetch cohorts');
      toast.error(message);
      return [];
    }
  },

  createCohort: async (id: string, cohort: ProgramCohort) => {
    try {
      const { data } = await api.post(`/programs/${id}/cohorts`, cohort);
      const created = data.data as ProgramCohort;
      set({
        programs: get().programs.map((p) =>
          p.id === id ? { ...p, cohorts: [...(p.cohorts || []), created] } : p,
        ),
      });
      toast.success('Cohort added');
    } catch (error: any) {
      const message = friendlyError(error, 'Failed to create cohort');
      toast.error(message);
      throw error;
    }
  },

  clearCurrent: () => set({ currentProgram: null, error: null }),
}));
