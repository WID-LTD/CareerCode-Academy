import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronDown, ChevronUp, UserX, UserCheck,
  Ban, Trash2, Mail, Shield, ShieldOff, Loader2, AlertCircle, X,
  Download, Eye, Calendar, BookOpen, Clock, Award, ChevronRight,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import { useAdminStore } from '@/store/adminStore';

const ROLES = ['all', 'student', 'instructor', 'admin', 'super_admin'];
const STATUS_OPTIONS = ['all', 'active', 'suspended', 'verified', 'unverified'];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const BULK_ROLES = ['student', 'instructor', 'admin'];

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return '—';
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function exportCSV(users: any[]) {
  const headers = ['Name', 'Email', 'Role', 'Status', 'Joined', 'Last Login', 'Enrolled Courses', 'Completed Courses'];
  const rows = users.map(u => [
    u.name, u.email, u.role,
    u.is_suspended ? 'Suspended' : 'Active',
    new Date(u.created_at).toLocaleDateString(),
    u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : '—',
    u.enrolled_courses_count ?? '—',
    u.completed_courses_count ?? '—',
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function AdminUsers() {
  const {
    users, isLoading, error, fetchUsers,
    suspendUser, reactivateUser, deleteUser, resetUserPassword,
    updateUserRole, bulkUpdateUserRole, setUserDetail, userDetail,
  } = useAdminStore();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; userId?: string; userName?: string; bulk?: boolean } | null>(null);
  const [bulkRoleTarget, setBulkRoleTarget] = useState('');

  useEffect(() => {
    fetchUsers(1, 1000);
  }, [fetchUsers]);

  const stats = useMemo(() => {
    const s = { student: 0, instructor: 0, admin: 0, super_admin: 0, suspended: 0, verified: 0 };
    users.forEach(u => {
      if (s.hasOwnProperty(u.role)) (s as any)[u.role]++;
      if (u.is_suspended) s.suspended++;
      if (u.is_verified) s.verified++;
    });
    return s;
  }, [users]);

  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter !== 'all') list = list.filter(u => u.role === roleFilter);
    if (statusFilter === 'suspended') list = list.filter(u => u.is_suspended);
    else if (statusFilter === 'active') list = list.filter(u => !u.is_suspended);
    else if (statusFilter === 'verified') list = list.filter(u => u.is_verified);
    else if (statusFilter === 'unverified') list = list.filter(u => !u.is_verified);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    return list;
  }, [users, roleFilter, statusFilter, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: any = (a as any)[sortField];
      let bVal: any = (b as any)[sortField];
      if (sortField === 'status') { aVal = a.is_suspended ? 1 : 0; bVal = b.is_suspended ? 1 : 0; }
      if (aVal == null) aVal = ''; if (bVal == null) bVal = '';
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    if (selected.size === paginated.length) setSelected(new Set());
    else setSelected(new Set(paginated.map(u => u._id)));
  };

  const handleAction = useCallback(async (type: string, userId?: string) => {
    if (!userId) return;
    setActionLoading(userId);
    try {
      if (type === 'suspend') await suspendUser(userId, '');
      else if (type === 'reactivate') await reactivateUser(userId);
      else if (type === 'delete') await deleteUser(userId);
      else if (type === 'change-role') { /* handled separately */ }
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  }, [suspendUser, reactivateUser, deleteUser]);

  const handleBulkAction = useCallback(async (type: string) => {
    setActionLoading('bulk');
    try {
      if (type === 'suspend') await Promise.all([...selected].map(id => suspendUser(id, '')));
      else if (type === 'reactivate') await Promise.all([...selected].map(id => reactivateUser(id)));
      else if (type === 'delete') await Promise.all([...selected].map(id => deleteUser(id)));
      else if (type === 'change-role' && bulkRoleTarget) {
        await bulkUpdateUserRole([...selected], bulkRoleTarget);
        setBulkRoleTarget('');
      }
      setSelected(new Set());
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  }, [selected, suspendUser, reactivateUser, deleteUser, bulkUpdateUserRole, bulkRoleTarget]);

  const openDetail = (user: any) => {
    setUserDetail(user);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const roleBadge = (role: string) => {
    const map: Record<string, string> = { student: 'info', instructor: 'warning', admin: 'danger', super_admin: 'success' };
    return <Badge variant={(map[role] as any) || 'default'}>{role.replace('_', ' ')}</Badge>;
  };

  if (isLoading && users.length === 0) return <PageSkeleton />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header + Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Users</h1>
          <p className="text-gray-500 mt-1">{users.length} total users</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCSV(sorted)} disabled={sorted.length === 0}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: 'Students', count: stats.student, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Instructors', count: stats.instructor, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Admins', count: stats.admin, color: 'text-rose-500', bg: 'bg-rose-500/10' },
          { label: 'Super Admins', count: stats.super_admin, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Suspended', count: stats.suspended, color: 'text-danger-500', bg: 'bg-danger-500/10' },
          { label: 'Verified', count: stats.verified, color: 'text-success-500', bg: 'bg-success-500/10' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl ${s.bg} p-3 text-center`}>
            <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
            <p className="text-[10px] text-gray-500 truncate">{s.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
          <p className="text-sm text-danger-600 dark:text-danger-400 flex-1">{error}</p>
          <Button size="sm" onClick={() => fetchUsers()}>Retry</Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search by name or email..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 outline-none focus:ring-2 focus:ring-primary-500/30 text-sm"
          />
        </div>
        {/* Role filters */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {ROLES.map(r => (
            <button
              key={r} onClick={() => { setRoleFilter(r); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${roleFilter === r ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {r === 'all' ? 'All' : r.replace('_', ' ')}
            </button>
          ))}
        </div>
        {/* Status filters */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === s ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-sm">
          <span className="font-medium text-primary-600 dark:text-primary-400">{selected.size} selected</span>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
          <Button size="sm" variant="outline" onClick={() => {
            const emailList = [...selected].map(id => users.find(u => u._id === id)?.email).filter(Boolean);
            if (emailList.length) window.location.href = `mailto:${emailList.join(',')}`;
          }}>
            <Mail className="w-3.5 h-3.5" /> Email
          </Button>
          <select
            value={bulkRoleTarget}
            onChange={e => { setBulkRoleTarget(e.target.value); }}
            className="bg-white dark:bg-gray-800 rounded-lg px-2 py-1.5 text-xs border-0 outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            <option value="">Change role...</option>
            {BULK_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {bulkRoleTarget && (
            <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: 'change-role', bulk: true })}>
              <Shield className="w-3.5 h-3.5" /> Apply
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: 'suspend', bulk: true })}>
            <Ban className="w-3.5 h-3.5" /> Suspend
          </Button>
          <Button size="sm" variant="danger" onClick={() => setConfirmAction({ type: 'delete', bulk: true })}>
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </div>
      )}

      {/* Table */}
      <GlassCard className="overflow-hidden" hover={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="p-3 text-left w-10">
                  <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300 dark:border-gray-600" />
                </th>
                <th className="p-3 text-left cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name <SortIcon field="name" /></div>
                </th>
                <th className="p-3 text-left hidden md:table-cell cursor-pointer select-none" onClick={() => toggleSort('email')}>
                  <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email <SortIcon field="email" /></div>
                </th>
                <th className="p-3 text-left cursor-pointer select-none" onClick={() => toggleSort('role')}>
                  <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role <SortIcon field="role" /></div>
                </th>
                <th className="p-3 text-left hidden sm:table-cell cursor-pointer select-none" onClick={() => toggleSort('status')}>
                  <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status <SortIcon field="status" /></div>
                </th>
                <th className="p-3 text-left hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort('lastLogin')}>
                  <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Login <SortIcon field="lastLogin" /></div>
                </th>
                <th className="p-3 text-left hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                  <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined <SortIcon field="created_at" /></div>
                </th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((user) => (
                <tr
                  key={user._id}
                  className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
                  onClick={() => openDetail(user)}
                >
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(user._id)} onChange={() => toggleSelect(user._id)} className="rounded border-gray-300 dark:border-gray-600" />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {user.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-gray-400 md:hidden">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-gray-500 hidden md:table-cell">
                    <a href={`mailto:${user.email}`} onClick={e => e.stopPropagation()} className="hover:text-primary-500 transition-colors">{user.email}</a>
                  </td>
                  <td className="p-3">{roleBadge(user.role)}</td>
                  <td className="p-3 hidden sm:table-cell">
                    <Badge variant={user.is_suspended ? 'danger' : 'success'}>
                      {user.is_suspended ? 'Suspended' : 'Active'}
                    </Badge>
                  </td>
                  <td className="p-3 text-gray-500 hidden lg:table-cell text-xs">{formatRelative(user.lastLogin)}</td>
                  <td className="p-3 text-gray-500 hidden lg:table-cell">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => window.location.href = `mailto:${user.email}`} title="Send email">
                        <Mail className="w-3.5 h-3.5 text-gray-500" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmAction({ type: 'change-role', userId: user._id, userName: user.name })} title="Change role">
                        {user.role === 'admin' || user.role === 'super_admin' ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmAction({ type: user.is_suspended ? 'reactivate' : 'suspend', userId: user._id, userName: user.name })} disabled={actionLoading === user._id}>
                        {actionLoading === user._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                          user.is_suspended ? <UserCheck className="w-3.5 h-3.5 text-success-500" /> : <UserX className="w-3.5 h-3.5 text-amber-500" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmAction({ type: 'delete', userId: user._id, userName: user.name })} disabled={actionLoading === user._id}>
                        <Trash2 className="w-3.5 h-3.5 text-danger-500" />
                      </Button>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={8} className="p-12 text-center text-gray-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Rows:</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="bg-transparent border-0 text-sm font-medium outline-none">
              {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="ml-2">{filtered.length} total</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Prev</button>
            <span className="px-2 text-sm text-gray-500">{page} / {totalPages || 1}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Next</button>
          </div>
        </div>
      </GlassCard>

      {/* User Detail Drawer */}
      <AnimatePresence>
        {userDetail && (
          <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setUserDetail(null)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-16 bottom-0 w-full max-w-md z-50 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl overflow-y-auto"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold">User Details</h2>
                  <button onClick={() => setUserDetail(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Avatar + Name */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl font-bold text-white shrink-0">
                    {userDetail.name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{userDetail.name}</h3>
                    <p className="text-sm text-gray-500">{userDetail.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {roleBadge(userDetail.role)}
                      <Badge variant={userDetail.is_suspended ? 'danger' : 'success'}>
                        {userDetail.is_suspended ? 'Suspended' : 'Active'}
                      </Badge>
                      {userDetail.is_verified && <Badge variant="success">Verified</Badge>}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {userDetail.bio && (
                  <div className="mb-6 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{userDetail.bio}</p>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-blue-500/10 text-center">
                    <BookOpen className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-blue-600">{(userDetail as any).enrolled_courses_count ?? '—'}</p>
                    <p className="text-[10px] text-gray-500">Enrolled</p>
                  </div>
                  <div className="p-3 rounded-xl bg-success-500/10 text-center">
                    <Award className="w-4 h-4 text-success-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-success-600">{(userDetail as any).completed_courses_count ?? '—'}</p>
                    <p className="text-[10px] text-gray-500">Completed</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 text-center">
                    <Calendar className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-amber-600">{new Date(userDetail.created_at).toLocaleDateString()}</p>
                    <p className="text-[10px] text-gray-500">Joined</p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-500/10 text-center">
                    <Clock className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-purple-600">{formatRelative(userDetail.lastLogin)}</p>
                    <p className="text-[10px] text-gray-500">Last Login</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" onClick={() => window.location.href = `mailto:${userDetail.email}`}>
                      <Mail className="w-3.5 h-3.5 mr-2" /> Email
                    </Button>
                    <Button size="sm" variant="outline" onClick={async () => { await resetUserPassword(userDetail._id); }}>
                      <Shield className="w-3.5 h-3.5 mr-2" /> Reset Password
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setConfirmAction({ type: userDetail.is_suspended ? 'reactivate' : 'suspend', userId: userDetail._id, userName: userDetail.name });
                    }}>
                      {userDetail.is_suspended ? <UserCheck className="w-3.5 h-3.5 mr-2 text-success-500" /> : <Ban className="w-3.5 h-3.5 mr-2 text-amber-500" />}
                      {userDetail.is_suspended ? 'Reactivate' : 'Suspend'}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setConfirmAction({ type: 'delete', userId: userDetail._id, userName: userDetail.name })}>
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full max-w-sm p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Confirm Action</h3>
              <button onClick={() => setConfirmAction(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              {confirmAction.bulk ? (
                <>Are you sure you want to <strong>{confirmAction.type === 'change-role' ? `change role to ${bulkRoleTarget}` : confirmAction.type}</strong> <strong>{selected.size} users</strong>?</>
              ) : (
                <>Are you sure you want to <strong>{confirmAction.type === 'change-role' ? 'change role of' : confirmAction.type}</strong> <strong>{confirmAction.userName}</strong>?</>
              )}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button
                variant={confirmAction.type === 'delete' ? 'danger' : 'primary'}
                onClick={() => {
                  if (confirmAction.bulk) handleBulkAction(confirmAction.type);
                  else if (confirmAction.type === 'change-role' && confirmAction.userId) {
                    setActionLoading(confirmAction.userId);
                    updateUserRole(confirmAction.userId, bulkRoleTarget || 'admin').finally(() => { setActionLoading(null); setConfirmAction(null); });
                  } else handleAction(confirmAction.type, confirmAction.userId);
                }}
                disabled={actionLoading !== null}
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}