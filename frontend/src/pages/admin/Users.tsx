import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, ChevronDown, ChevronUp, MoreHorizontal, UserX, UserCheck,
  Ban, Trash2, Mail, Shield, ShieldOff, Loader2, AlertCircle, X,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAdminStore } from '@/store/adminStore';

const ROLES = ['all', 'student', 'instructor', 'admin', 'super_admin'];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function AdminUsers() {
  const { users, isLoading, error, fetchUsers, suspendUser, reactivateUser, deleteUser } = useAdminStore();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; userId: string; userName: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users
    .filter((u) => roleFilter === 'all' || u.role === roleFilter)
    .filter((u) => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  const sorted = [...filtered].sort((a, b) => {
    const aVal = (a as any)[sortField];
    const bVal = (b as any)[sortField];
    if (!aVal || !bVal) return 0;
    return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === paginated.length) setSelected(new Set());
    else setSelected(new Set(paginated.map((u) => u._id)));
  };

  const handleAction = async (type: string, userId: string) => {
    setActionLoading(userId);
    try {
      if (type === 'suspend') await suspendUser(userId, '');
      else if (type === 'reactivate') await reactivateUser(userId);
      else if (type === 'delete') await deleteUser(userId);
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const roleBadge = (role: string) => {
    const map: Record<string, string> = { student: 'info', instructor: 'warning', admin: 'danger', super_admin: 'success' };
    return <Badge variant={(map[role] as any) || 'default'}>{role}</Badge>;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Users</h1>
          <p className="text-gray-500 mt-1">{users.length} total users</p>
        </div>
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
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 outline-none focus:ring-2 focus:ring-primary-500/30 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {ROLES.map((r) => (
            <button
              key={r} onClick={() => { setRoleFilter(r); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${roleFilter === r ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {r === 'all' ? 'All' : r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-sm">
          <span className="font-medium text-primary-600 dark:text-primary-400">{selected.size} selected</span>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-2" />
          <Button size="sm" variant="outline"><Mail className="w-3.5 h-3.5" /> Email</Button>
          <Button size="sm" variant="outline" onClick={() => { selected.forEach((id) => handleAction('suspend', id)); selected.clear(); }}>
            <Ban className="w-3.5 h-3.5" /> Suspend
          </Button>
          <Button size="sm" variant="danger" onClick={() => selected.clear()}>
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
                <th className="p-3 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === paginated.length && paginated.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </th>
                <th className="p-3 text-left cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Name <SortIcon field="name" />
                  </div>
                </th>
                <th className="p-3 text-left hidden md:table-cell">Email</th>
                <th className="p-3 text-left cursor-pointer select-none" onClick={() => toggleSort('role')}>
                  <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Role <SortIcon field="role" />
                  </div>
                </th>
                <th className="p-3 text-left hidden sm:table-cell">Status</th>
                <th className="p-3 text-left hidden lg:table-cell">Joined</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((user) => (
                <tr key={user._id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(user._id)}
                      onChange={() => toggleSelect(user._id)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center text-xs font-bold text-primary-500">
                        {user.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-gray-400 md:hidden">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-gray-500 hidden md:table-cell">{user.email}</td>
                  <td className="p-3">{roleBadge(user.role)}</td>
                  <td className="p-3 hidden sm:table-cell">
                    <Badge variant={user.is_suspended ? 'danger' : 'success'}>
                      {user.is_suspended ? 'Suspended' : 'Active'}
                    </Badge>
                  </td>
                  <td className="p-3 text-gray-500 hidden lg:table-cell">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => setConfirmAction({ type: 'change-role', userId: user._id, userName: user.name })}
                      >
                        {user.role === 'admin' ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => setConfirmAction({ type: user.is_suspended ? 'reactivate' : 'suspend', userId: user._id, userName: user.name })}
                        disabled={actionLoading === user._id}
                      >
                        {actionLoading === user._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                          user.is_suspended ? <UserCheck className="w-3.5 h-3.5 text-success-500" /> :
                            <UserX className="w-3.5 h-3.5 text-amber-500" />}
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => setConfirmAction({ type: 'delete', userId: user._id, userName: user.name })}
                        disabled={actionLoading === user._id}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-danger-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-transparent border-0 text-sm font-medium outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="ml-2">{filtered.length} total</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Prev
            </button>
            <span className="px-2 text-sm text-gray-500">{page} / {totalPages || 1}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="glass-card w-full max-w-sm p-6 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Confirm Action</h3>
              <button onClick={() => setConfirmAction(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to <strong>{confirmAction.type}</strong> <strong className="text-gray-900 dark:text-gray-100">{confirmAction.userName}</strong>?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button
                variant={confirmAction.type === 'delete' ? 'danger' : 'primary'}
                onClick={() => handleAction(confirmAction.type, confirmAction.userId)}
              >
                {confirmAction.type === 'suspend' ? 'Suspend' :
                  confirmAction.type === 'reactivate' ? 'Reactivate' :
                    confirmAction.type === 'delete' ? 'Delete' : 'Confirm'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
