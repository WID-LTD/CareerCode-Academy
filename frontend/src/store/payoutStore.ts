import { create } from 'zustand';
import api from '@/lib/axios';

export interface PayoutBalance {
  totalRevenue: number;
  commissionRate: number;
  platformFee: number;
  netShare: number;
  totalPaid: number;
  availableBalance: number;
}

interface PayoutState {
  payouts: any[];
  balance: PayoutBalance | null;
  adminPayouts: any[];
  adminStats: any;
  isLoading: boolean;
  error: string | null;

  fetchPayouts: (page?: number) => Promise<void>;
  requestPayout: (amount: number, method: string, details: string) => Promise<void>;
  fetchAdminPayouts: (page?: number, status?: string) => Promise<void>;
  approvePayout: (id: string, notes?: string) => Promise<void>;
  markPaidPayout: (id: string, notes?: string) => Promise<void>;
  rejectPayout: (id: string, reason: string) => Promise<void>;
}

export const usePayoutStore = create<PayoutState>((set, get) => ({
  payouts: [],
  balance: null,
  adminPayouts: [],
  adminStats: null,
  isLoading: false,
  error: null,

  fetchPayouts: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/payouts/instructor?page=${page}`);
      set({
        payouts: data.data || [],
        balance: data.balance || null,
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to fetch payouts' });
    }
  },

  requestPayout: async (amount: number, payment_method: string, payment_details: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/payouts/instructor/request', { amount, payment_method, payment_details });
      set({ isLoading: false });
      get().fetchPayouts();
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to request payout' });
      throw error;
    }
  },

  fetchAdminPayouts: async (page = 1, status?: string) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (status) params.set('status', status);
      const { data } = await api.get(`/payouts/admin?${params}`);
      set({
        adminPayouts: data.data || [],
        adminStats: data.stats || null,
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to fetch payouts' });
    }
  },

  approvePayout: async (id: string, notes?: string) => {
    await api.put(`/payouts/admin/${id}/approve`, { notes });
    get().fetchAdminPayouts();
  },

  markPaidPayout: async (id: string, notes?: string) => {
    await api.put(`/payouts/admin/${id}/mark-paid`, { notes });
    get().fetchAdminPayouts();
  },

  rejectPayout: async (id: string, reason: string) => {
    await api.put(`/payouts/admin/${id}/reject`, { reason });
    get().fetchAdminPayouts();
  },
}));