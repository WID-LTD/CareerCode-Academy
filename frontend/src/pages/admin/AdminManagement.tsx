import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, UserPlus, Search, Crown, Settings, LayoutDashboard } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'super_admin';
  avatar: string | null;
  created_at: string;
  last_login: string | null;
  course_count: number;
  allowed_dashboards?: string[] | null;
}

const ALLOWED_DASHBOARDS: { path: string; label: string }[] = [
  { path: '/admin/dashboard', label: 'Dashboard' },
  { path: '/admin/todos', label: 'To-Do' },
  { path: '/admin/users', label: 'Users' },
  { path: '/admin/courses', label: 'Courses' },
  { path: '/admin/categories', label: 'Categories' },
  { path: '/admin/course-proposals', label: 'Course Proposals' },
  { path: '/admin/applications', label: 'Applications' },
  { path: '/admin/payments', label: 'Payments' },
  { path: '/admin/exams', label: 'Exams' },
  { path: '/admin/exams/monitor', label: 'Exam Monitor' },
  { path: '/admin/certificates', label: 'Certificates' },
  { path: '/admin/certificate-templates', label: 'Cert. Templates' },
  { path: '/admin/calendar', label: 'Calendar' },
  { path: '/admin/tickets', label: 'Support Tickets' },
  { path: '/admin/broadcasts', label: 'Notifications' },
  { path: '/admin/messages', label: 'Messages' },
  { path: '/admin/community-management', label: 'Community' },
  { path: '/admin/reports', label: 'Reports' },
  { path: '/admin/analytics', label: 'Analytics' },
  { path: '/admin/settings', label: 'Settings' },
  { path: '/admin/payouts', label: 'Payouts' },
  { path: '/admin/audit-log', label: 'Audit Log' },
  { path: '/admin/learning-paths', label: 'Learning Paths' },
  { path: '/admin/feature-flags', label: 'Feature Flags' },
  { path: '/admin/system-health', label: 'System Health' },
];

export default function AdminManagement() {
  const { user } = useAuthStore();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [demoting, setDemoting] = useState<number | null>(null);
  const [permModalAdmin, setPermModalAdmin] = useState<AdminUser | null>(null);
  const [permSelection, setPermSelection] = useState<string[]>([]);
  const [permSaving, setPermSaving] = useState(false);
  const [permFullAccess, setPermFullAccess] = useState(false);

  async function fetchAdmins() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/admins');
      if (data.success) setAdmins(data.data);
    } catch {
      toast.error('Failed to load admin users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAdmins(); }, []);

  const handlePromote = async () => {
    if (!promoteEmail.trim()) return;
    setPromoting(true);
    try {
      const { data } = await api.put(`/admin/users/${promoteEmail.trim()}/promote-admin`);
      if (data.success) {
        toast.success('User promoted to admin!');
        setShowPromoteModal(false);
        setPromoteEmail('');
        fetchAdmins();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to promote user');
    } finally {
      setPromoting(false);
    }
  };

  const handleDemote = async (adminId: number, adminName: string) => {
    if (!window.confirm(`Demote "${adminName}" back to student? They will lose all admin access.`)) return;
    setDemoting(adminId);
    try {
      const { data } = await api.put(`/admin/users/${adminId}/demote-admin`);
      if (data.success) {
        toast.success('Admin demoted to student');
        fetchAdmins();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to demote');
    } finally {
      setDemoting(null);
    }
  };

  const openPermModal = (admin: AdminUser) => {
    const allowed = admin.allowed_dashboards;
    if (allowed === null || allowed === undefined) {
      setPermFullAccess(true);
      setPermSelection(ALLOWED_DASHBOARDS.map(d => d.path));
    } else {
      setPermFullAccess(false);
      setPermSelection(allowed);
    }
    setPermModalAdmin(admin);
  };

  const handleSavePermissions = async () => {
    if (!permModalAdmin) return;
    setPermSaving(true);
    try {
      const payload = permFullAccess ? null : permSelection;
      const { data } = await api.put(`/admin/users/${permModalAdmin.id}/permissions`, { allowed_dashboards: payload });
      if (data.success) {
        toast.success('Permissions updated');
        setPermModalAdmin(null);
        fetchAdmins();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update permissions');
    } finally {
      setPermSaving(false);
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';

  const filtered = admins.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <PageSkeleton />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 break-words">
            <ShieldAlert className="w-6 h-6 text-primary-500" />
            Admin Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage platform administrators</p>
        </div>
        {isSuperAdmin && (
          <Button variant="primary" onClick={() => setShowPromoteModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" /> Promote User
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard className="p-4 text-center">
          <Crown className="w-5 h-5 text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{admins.filter(a => a.role === 'super_admin').length}</p>
          <p className="text-xs text-gray-500">Super Admins</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <Shield className="w-5 h-5 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{admins.filter(a => a.role === 'admin').length}</p>
          <p className="text-xs text-gray-500">Admins</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold">{admins.length}</p>
          <p className="text-xs text-gray-500">Total</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold">{admins.reduce((sum, a) => sum + a.course_count, 0)}</p>
          <p className="text-xs text-gray-500">Courses Managed</p>
        </GlassCard>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Search admins..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Admin List */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Admin</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Courses</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Access</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((admin, i) => (
                <motion.tr
                  key={admin.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors ${
                    String(admin.id) === String(user?.id) ? 'bg-primary-500/5' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {admin.avatar ? (
                          <img src={admin.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          admin.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{admin.name}</p>
                        <p className="text-xs text-gray-500">{admin.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={admin.role === 'super_admin' ? 'warning' : 'primary'} className="capitalize">
                      {admin.role === 'super_admin' && <Crown className="w-3 h-3 mr-1" />}
                      {admin.role.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{admin.email}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{admin.course_count}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {admin.role === 'super_admin' ? (
                      <span className="text-xs text-amber-600 font-medium">All Access</span>
                    ) : admin.allowed_dashboards === null || admin.allowed_dashboards === undefined ? (
                      <span className="text-xs text-emerald-600 font-medium">Full Access</span>
                    ) : admin.allowed_dashboards.length === 0 ? (
                      <span className="text-xs text-red-500">No Access</span>
                    ) : (
                      <span className="text-xs text-gray-500">{admin.allowed_dashboards.length} dashboards</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isSuperAdmin && admin.role === 'admin' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openPermModal(admin)}
                          title="Edit dashboard permissions"
                        >
                          <Settings className="w-3.5 h-3.5 mr-1" /> Permissions
                        </Button>
                      )}
                      {isSuperAdmin && admin.role === 'admin' && String(admin.id) !== String(user?.id) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDemote(admin.id, admin.name)}
                          disabled={demoting === admin.id}
                        >
                          {demoting === admin.id ? 'Demoting...' : 'Demote'}
                        </Button>
                      )}
                      {String(admin.id) === String(user?.id) && (
                        <span className="text-xs text-gray-500 italic">You</span>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">No admin users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Permissions Modal (super_admin checkbox per dashboard) */}
      {permModalAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <h2 className="text-lg font-bold flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-primary-500" /> Dashboard Permissions
            </h2>
            <p className="text-sm text-gray-500 mb-4">Control which admin dashboards <strong>{permModalAdmin.name}</strong> can access. (super_admin only)</p>

            <label className="flex items-center gap-2 p-3 rounded-xl border border-primary-500/20 bg-primary-500/5 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={permFullAccess}
                onChange={(e) => {
                  const v = e.target.checked;
                  setPermFullAccess(v);
                  if (v) setPermSelection(ALLOWED_DASHBOARDS.map(d => d.path));
                }}
                className="rounded text-primary-500"
              />
              <span className="text-sm font-medium">Full Access (all dashboards)</span>
              <span className="text-xs text-gray-500 ml-auto">When checked, admin sees all dashboards (stored as NULL).</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALLOWED_DASHBOARDS.map(d => (
                <label
                  key={d.path}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${permSelection.includes(d.path) ? 'border-primary-500/30 bg-primary-500/5' : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                >
                  <input
                    type="checkbox"
                    checked={permSelection.includes(d.path)}
                    disabled={permFullAccess}
                    onChange={(e) => {
                      if (permFullAccess) return;
                      if (e.target.checked) setPermSelection(prev => [...prev, d.path]);
                      else setPermSelection(prev => prev.filter(p => p !== d.path));
                    }}
                    className="rounded text-primary-500"
                  />
                  <span className="text-sm">{d.label}</span>
                  <span className="text-[10px] text-gray-400 ml-auto truncate">{d.path}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => {
                  setPermSelection([]);
                  setPermFullAccess(false);
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear All
              </button>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setPermModalAdmin(null)}>Cancel</Button>
                <Button variant="primary" onClick={handleSavePermissions} disabled={permSaving}>
                  {permSaving ? 'Saving...' : `Save (${permFullAccess ? 'Full' : permSelection.length})`}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Promote Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
          >
            <h2 className="text-lg font-bold mb-2">Promote User to Admin</h2>
            <p className="text-sm text-gray-500 mb-4">Enter the email or user ID of the user to promote.</p>
            <Input
              placeholder="User email or ID..."
              value={promoteEmail}
              onChange={(e) => setPromoteEmail(e.target.value)}
            />
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => { setShowPromoteModal(false); setPromoteEmail(''); }}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handlePromote} disabled={promoting || !promoteEmail.trim()}>
                {promoting ? 'Promoting...' : 'Promote to Admin'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}