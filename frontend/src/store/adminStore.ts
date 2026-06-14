import { create } from 'zustand';
import api from '@/lib/axios';

function normalizeId(item: any): any {
  if (!item || typeof item !== 'object') return item;
  return {
    ...item,
    _id: item._id || item.id,
    amount: item.amount !== undefined ? Number(item.amount) : undefined,
    is_revoked: item.is_revoked !== undefined ? item.is_revoked : !!item.revoked,
    is_featured: item.is_featured !== undefined ? item.is_featured : !!item.featured,
    certificateId: item.certificateId || item.verification_code,
    user: item.user || (item.user_name ? { name: item.user_name, email: item.user_email, _id: item.user_id } : undefined),
    course: item.course || (item.course_title ? { title: item.course_title, _id: item.course_id } : undefined),
    instructor: item.instructor || (item.instructor_name ? { name: item.instructor_name, _id: item.instructor_id } : undefined),
    admin: item.admin || (item.admin_name ? { name: item.admin_name, _id: item.admin_id } : undefined),
    userId: item.userId || (item.user_id && item.full_name ? { name: item.full_name, email: item.email, _id: item.user_id } : undefined),
  };
}

function normalizeList(items: any[]): any[] {
  return (items || []).map(normalizeId);
}

export interface AdminStats {
  totalStudents: number;
  totalInstructors: number;
  pendingApplications: number;
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalEnrollments: number;
  activeUsers: number;
  certificatesIssued: number;
  monthlyRevenue: number;
  totalRevenue: number;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  bio: string | null;
  is_verified: boolean;
  status: string;
  is_suspended?: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  lastLogin: string | null;
  created_at: string;
}

export interface AdminCourse {
  _id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  price: number;
  category: string;
  instructor: { name: string; _id: string };
  instructor_id: string;
  instructor_name?: string;
  level: string;
  duration: number;
  published: boolean;
  featured: boolean;
  is_featured?: boolean;
  status: string;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  slug: string;
  created_at: string;
  enrollmentCount?: number;
  rating?: number;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface AdminPayment {
  _id: string;
  user_id: string;
  user: { name: string; email: string; _id: string };
  user_name: string;
  user_email: string;
  course: { title: string; _id: string };
  course_id: string;
  course_title: string;
  amount: number;
  currency: string;
  provider: string;
  reference: string;
  status: string;
  created_at: string;
}

export interface InstructorApplication {
  _id: string;
  userId: { name: string; email: string; _id: string };
  full_name: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  professional_title: string;
  years_of_experience?: string;
  years_experience: string;
  specialization: string;
  qualifications?: string;
  message?: string;
  bio: string;
  teaching_experience: string;
  resume_url: string;
  portfolio_url: string;
  linkedin_url: string;
  github_url: string;
  status: string;
  review_notes: string;
  created_at: string;
}

export interface Certificate {
  _id: string;
  userId: { name: string; _id: string };
  user: { name: string; _id: string };
  course: { title: string; _id: string };
  user_id: string;
  user_name: string;
  course_id: string;
  course_title: string;
  certificateId?: string;
  verification_code: string;
  issued_at: string;
  expires_at?: string;
  revoked: boolean;
  is_revoked?: boolean;
}

export interface SupportTicket {
  _id: string;
  user: { name: string; email: string; _id: string };
  user_id: string;
  user_name: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  assigned_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface BroadcastNotification {
  _id: string;
  title: string;
  message: string;
  audience: string;
  type: string;
  scheduledAt: string | null;
  sentAt: string | null;
  status: string;
  created_at: string;
}

export interface AuditLog {
  _id: string;
  admin: { name: string; _id: string };
  admin_id: string;
  admin_name: string;
  action: string;
  resource_type: string;
  resource_id: string;
  ip_address: string;
  user_agent: string;
  details: string;
  created_at: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  category: string;
  description: string;
}

interface AdminState {
  // Dashboard
  stats: AdminStats | null;
  recentUsers: AdminUser[];
  recentPayments: AdminPayment[];
  monthlyRevenue: any[];
  enrollmentTrend: any[];
  userRegistrationTrend: any[];
  topCourses: any[];
  recentActivities: any[];

  // Users
  users: AdminUser[];
  usersPagination: any;
  userSearchQuery: string;
  userRoleFilter: string;

  // Applications
  applications: InstructorApplication[];
  applicationsPagination: any;

  // Courses
  courses: AdminCourse[];
  coursesPagination: any;

  // Payments
  payments: AdminPayment[];
  paymentsPagination: any;

  // Certificates
  certificates: Certificate[];
  certificatesPagination: any;

  // Support Tickets
  tickets: SupportTicket[];
  ticketsPagination: any;

  // Notifications (broadcast)
  broadcastNotifications: BroadcastNotification[];
  broadcastPagination: any;

  // Audit Logs
  auditLogs: AuditLog[];
  auditPagination: any;

  // Categories
  categories: Category[];
  categoriesPagination: any;

  // Settings
  settings: SystemSetting[];

  isLoading: boolean;
  error: string | null;

  // Dashboard
  fetchDashboardData: () => Promise<void>;

  // Users
  fetchUsers: (page?: number, limit?: number) => Promise<void>;
  setUserSearch: (query: string) => void;
  setUserRoleFilter: (role: string) => void;
  suspendUser: (id: string, reason: string) => Promise<void>;
  reactivateUser: (id: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  resetUserPassword: (id: string) => Promise<void>;
  updateUserRole: (id: string, role: string) => Promise<void>;

  // Applications
  fetchApplications: (page?: number, limit?: number) => Promise<void>;
  approveApplication: (id: string, notes: string) => Promise<void>;
  rejectApplication: (id: string, notes: string) => Promise<void>;
  requestChangesApplication: (id: string, notes: string) => Promise<void>;

  // Courses
  fetchCourses: (page?: number, limit?: number) => Promise<void>;
  approveCourse: (id: string) => Promise<void>;
  rejectCourse: (id: string, reason: string) => Promise<void>;
  archiveCourse: (id: string) => Promise<void>;
  featureCourse: (id: string) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;

  // Payments
  fetchPayments: (page?: number, limit?: number) => Promise<void>;
  refundPayment: (id: string) => Promise<void>;

  // Certificates
  fetchCertificates: (page?: number, limit?: number) => Promise<void>;
  revokeCertificate: (id: string) => Promise<void>;
  reissueCertificate: (id: string) => Promise<void>;

  // Support Tickets
  fetchTickets: (page?: number, limit?: number) => Promise<void>;
  replyToTicket: (id: string, message: string) => Promise<void>;
  closeTicket: (id: string) => Promise<void>;
  reopenTicket: (id: string) => Promise<void>;
  assignTicket: (id: string, adminId: string) => Promise<void>;

  // Broadcast Notifications
  fetchBroadcastNotifications: (page?: number, limit?: number) => Promise<void>;
  sendBroadcastNotification: (data: any) => Promise<void>;
  deleteBroadcastNotification: (id: string) => Promise<void>;

  // Categories
  fetchCategories: () => Promise<void>;
  createCategory: (data: any) => Promise<void>;
  updateCategory: (id: string, data: any) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Audit Logs
  fetchAuditLogs: (page?: number, limit?: number) => Promise<void>;

  // Settings
  fetchSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  stats: null,
  recentUsers: [],
  recentPayments: [],
  monthlyRevenue: [],
  enrollmentTrend: [],
  userRegistrationTrend: [],
  topCourses: [],
  recentActivities: [],

  users: [],
  usersPagination: null,
  userSearchQuery: '',
  userRoleFilter: 'all',

  applications: [],
  applicationsPagination: null,

  courses: [],
  coursesPagination: null,

  payments: [],
  paymentsPagination: null,

  certificates: [],
  certificatesPagination: null,

  tickets: [],
  ticketsPagination: null,

  broadcastNotifications: [],
  broadcastPagination: null,

  auditLogs: [],
  auditPagination: null,

  categories: [],
  categoriesPagination: null,

  settings: [],

  isLoading: false,
  error: null,

  // ═══════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════
  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/admin/dashboard');
      const d = data.data;
      set({
        stats: d.stats,
        recentUsers: normalizeList(d.recentUsers),
        recentPayments: normalizeList(d.recentPayments),
        monthlyRevenue: d.monthlyRevenue || [],
        enrollmentTrend: d.enrollmentTrend || [],
        userRegistrationTrend: d.userRegistrationTrend || [],
        topCourses: d.topCourses || [],
        recentActivities: d.recentActivities || [],
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to fetch dashboard' });
    }
  },

  // ═══════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════
  fetchUsers: async (page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const { userSearchQuery, userRoleFilter } = get();
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (userSearchQuery) params.set('search', userSearchQuery);
      if (userRoleFilter && userRoleFilter !== 'all') params.set('role', userRoleFilter);
      const { data } = await api.get(`/admin/users?${params}`);
      set({ users: normalizeList(data.data), usersPagination: data.pagination, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to fetch users' });
    }
  },
  setUserSearch: (query: string) => set({ userSearchQuery: query }),
  setUserRoleFilter: (role: string) => set({ userRoleFilter: role }),
  suspendUser: async (id: string, reason: string) => {
    await api.put(`/admin/users/${id}/suspend`, { reason });
    get().fetchUsers(get().usersPagination?.page || 1);
  },
  reactivateUser: async (id: string) => {
    await api.put(`/admin/users/${id}/reactivate`);
    get().fetchUsers(get().usersPagination?.page || 1);
  },
  deleteUser: async (id: string) => {
    await api.delete(`/admin/users/${id}`);
    set({ users: get().users.filter(u => u._id !== id) });
  },
  resetUserPassword: async (id: string) => {
    await api.post(`/admin/users/${id}/reset-password`);
  },
  updateUserRole: async (id: string, role: string) => {
    await api.put(`/admin/users/${id}/role`, { role });
    get().fetchUsers(get().usersPagination?.page || 1);
  },

  // ═══════════════════════════════════════
  // APPLICATIONS
  // ═══════════════════════════════════════
  fetchApplications: async (page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/admin/applications?page=${page}&limit=${limit}`);
      set({ applications: normalizeList(data.data), applicationsPagination: data.pagination, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to fetch applications' });
    }
  },
  approveApplication: async (id: string, notes: string) => {
    await api.put(`/admin/applications/${id}/approve`, { notes });
    get().fetchApplications(get().applicationsPagination?.page || 1);
  },
  rejectApplication: async (id: string, notes: string) => {
    await api.put(`/admin/applications/${id}/reject`, { notes });
    get().fetchApplications(get().applicationsPagination?.page || 1);
  },
  requestChangesApplication: async (id: string, notes: string) => {
    await api.put(`/admin/applications/${id}/request-changes`, { notes });
    get().fetchApplications(get().applicationsPagination?.page || 1);
  },

  // ═══════════════════════════════════════
  // COURSES
  // ═══════════════════════════════════════
  fetchCourses: async (page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/admin/courses?page=${page}&limit=${limit}`);
      set({ courses: normalizeList(data.data), coursesPagination: data.pagination, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to fetch courses' });
    }
  },
  approveCourse: async (id: string) => {
    await api.put(`/admin/courses/${id}/approve`);
    get().fetchCourses(get().coursesPagination?.page || 1);
  },
  rejectCourse: async (id: string, reason: string) => {
    await api.put(`/admin/courses/${id}/reject`, { reason });
    get().fetchCourses(get().coursesPagination?.page || 1);
  },
  archiveCourse: async (id: string) => {
    await api.put(`/admin/courses/${id}/archive`);
    get().fetchCourses(get().coursesPagination?.page || 1);
  },
  featureCourse: async (id: string) => {
    await api.put(`/admin/courses/${id}/feature`);
    get().fetchCourses(get().coursesPagination?.page || 1);
  },
  deleteCourse: async (id: string) => {
    await api.delete(`/admin/courses/${id}`);
    set({ courses: get().courses.filter(c => c._id !== id) });
  },

  // ═══════════════════════════════════════
  // PAYMENTS
  // ═══════════════════════════════════════
  fetchPayments: async (page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/admin/payments?page=${page}&limit=${limit}`);
      set({ payments: normalizeList(data.data), paymentsPagination: data.pagination, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to fetch payments' });
    }
  },
  refundPayment: async (id: string) => {
    await api.post(`/admin/payments/${id}/refund`);
    get().fetchPayments(get().paymentsPagination?.page || 1);
  },

  // ═══════════════════════════════════════
  // CERTIFICATES
  // ═══════════════════════════════════════
  fetchCertificates: async (page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/admin/certificates?page=${page}&limit=${limit}`);
      set({ certificates: normalizeList(data.data), certificatesPagination: data.pagination, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to fetch certificates' });
    }
  },
  revokeCertificate: async (id: string) => {
    await api.put(`/admin/certificates/${id}/revoke`);
    get().fetchCertificates(get().certificatesPagination?.page || 1);
  },
  reissueCertificate: async (id: string) => {
    await api.put(`/admin/certificates/${id}/reissue`);
    get().fetchCertificates(get().certificatesPagination?.page || 1);
  },

  // ═══════════════════════════════════════
  // SUPPORT TICKETS
  // ═══════════════════════════════════════
  fetchTickets: async (page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/admin/tickets?page=${page}&limit=${limit}`);
      set({ tickets: normalizeList(data.data), ticketsPagination: data.pagination, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to fetch tickets' });
    }
  },
  replyToTicket: async (id: string, message: string) => {
    await api.post(`/admin/tickets/${id}/reply`, { message });
  },
  closeTicket: async (id: string) => {
    await api.put(`/admin/tickets/${id}/close`);
    get().fetchTickets(get().ticketsPagination?.page || 1);
  },
  reopenTicket: async (id: string) => {
    await api.put(`/admin/tickets/${id}/reopen`);
    get().fetchTickets(get().ticketsPagination?.page || 1);
  },
  assignTicket: async (id: string, adminId: string) => {
    await api.put(`/admin/tickets/${id}/assign`, { adminId });
    get().fetchTickets(get().ticketsPagination?.page || 1);
  },

  // ═══════════════════════════════════════
  // BROADCAST NOTIFICATIONS
  // ═══════════════════════════════════════
  fetchBroadcastNotifications: async (page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/admin/broadcasts?page=${page}&limit=${limit}`);
      set({ broadcastNotifications: normalizeList(data.data), broadcastPagination: data.pagination, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to fetch broadcasts' });
    }
  },
  sendBroadcastNotification: async (formData: any) => {
    await api.post('/admin/broadcasts', formData);
    get().fetchBroadcastNotifications(get().broadcastPagination?.page || 1);
  },
  deleteBroadcastNotification: async (id: string) => {
    await api.delete(`/admin/broadcasts/${id}`);
    get().fetchBroadcastNotifications(get().broadcastPagination?.page || 1);
  },

  // ═══════════════════════════════════════
  // CATEGORIES
  // ═══════════════════════════════════════
  fetchCategories: async () => {
    try {
      const { data } = await api.get('/admin/categories');
      set({ categories: normalizeList(data.data), categoriesPagination: data.pagination });
    } catch { /* ignore */ }
  },
  createCategory: async (formData: any) => {
    await api.post('/admin/categories', formData);
    get().fetchCategories();
  },
  updateCategory: async (id: string, formData: any) => {
    await api.put(`/admin/categories/${id}`, formData);
    get().fetchCategories();
  },
  deleteCategory: async (id: string) => {
    await api.delete(`/admin/categories/${id}`);
    get().fetchCategories();
  },

  // ═══════════════════════════════════════
  // AUDIT LOGS
  // ═══════════════════════════════════════
  fetchAuditLogs: async (page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/admin/audit-logs?page=${page}&limit=${limit}`);
      set({ auditLogs: normalizeList(data.data), auditPagination: data.pagination, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to fetch audit logs' });
    }
  },

  // ═══════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════
  fetchSettings: async () => {
    try {
      const { data } = await api.get('/admin/settings');
      set({ settings: data.data || [] });
    } catch { /* ignore */ }
  },
  updateSetting: async (key: string, value: string) => {
    await api.put('/admin/settings', { key, value });
    get().fetchSettings();
  },
}));
