import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Download, RotateCcw, Ban, AlertCircle, Award, Loader2, X, Plus,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAdminStore } from '@/store/adminStore';
import api from '@/lib/axios';

export default function AdminCertificates() {
  const { certificates, isLoading, error, fetchCertificates, issueCertificate, revokeCertificate, reissueCertificate } = useAdminStore();
  const [search, setSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: string; certId: string; userName: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [showIssue, setShowIssue] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [completedCourses, setCompletedCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState('');

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  useEffect(() => {
    if (!showIssue) {
      setUserSearch('');
      setUserResults([]);
      setSelectedUser(null);
      setCompletedCourses([]);
      setSelectedCourseId('');
      setIssueError('');
    }
  }, [showIssue]);

  useEffect(() => {
    if (!userSearch.trim() || !showIssue) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const { data } = await api.get(`/admin/users?search=${encodeURIComponent(userSearch)}&limit=10`);
        setUserResults(data.data || []);
      } catch { /* ignore */ }
      setSearchingUsers(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, showIssue]);

  const selectUser = useCallback(async (user: any) => {
    setSelectedUser(user);
    setUserSearch(user.name);
    setUserResults([]);
    setLoadingCourses(true);
    setSelectedCourseId('');
    try {
      const { data } = await api.get(`/admin/users/${user.id}/completed-courses`);
      setCompletedCourses(data.data || []);
    } catch { /* ignore */ }
    setLoadingCourses(false);
  }, []);

  const handleIssue = async () => {
    if (!selectedUser || !selectedCourseId) return;
    setIssuing(true);
    setIssueError('');
    try {
      await issueCertificate(selectedUser.id, selectedCourseId);
      setShowIssue(false);
    } catch (e: any) {
      setIssueError(e?.message || 'Failed to issue certificate');
    }
    setIssuing(false);
  };

  const filtered = certificates.filter((c) =>
    !search ||
    c.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.course?.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.certificateId?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction.type === 'revoke') await revokeCertificate(confirmAction.certId);
      else if (confirmAction.type === 'reissue') await reissueCertificate(confirmAction.certId);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Certificates</h1>
          <p className="text-gray-500 mt-1">Manage issued certificates.</p>
        </div>
        <Button onClick={() => setShowIssue(true)}>
          <Plus size={16} className="mr-1" /> Issue Certificate
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
          <p className="text-sm text-danger-600 dark:text-danger-400 flex-1">{error}</p>
          <Button size="sm" onClick={() => fetchCertificates()}>Retry</Button>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text" placeholder="Search by name, course, or ID..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 outline-none focus:ring-2 focus:ring-primary-500/30 text-sm"
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <div className="md:col-span-3 text-center py-16 text-gray-400">No certificates found.</div>
        )}
        {filtered.map((cert) => (
          <motion.div key={cert._id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-5" hover>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Award className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{cert.user?.name}</p>
                    <p className="text-xs text-gray-500">{cert.certificateId}</p>
                  </div>
                </div>
                <Badge variant={cert.is_revoked ? 'danger' : 'success'}>
                  {cert.is_revoked ? 'Revoked' : 'Active'}
                </Badge>
              </div>
              <p className="text-sm font-medium mb-1">{cert.course?.title || 'Course'}</p>
              <p className="text-xs text-gray-500 mb-3">
                Issued: {new Date(cert.issued_at).toLocaleDateString()}
                {cert.expires_at && ` · Exp: ${new Date(cert.expires_at).toLocaleDateString()}`}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1"><Download className="w-3.5 h-3.5" /> Download</Button>
                {!cert.is_revoked && (
                  <Button size="sm" variant="ghost" onClick={() => setConfirmAction({ type: 'revoke', certId: cert._id, userName: cert.user?.name })}>
                    <Ban className="w-3.5 h-3.5 text-danger-500" />
                  </Button>
                )}
                {cert.is_revoked && (
                  <Button size="sm" variant="ghost" onClick={() => setConfirmAction({ type: 'reissue', certId: cert._id, userName: cert.user?.name })}>
                    <RotateCcw className="w-3.5 h-3.5 text-primary-500" />
                  </Button>
                )}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full max-w-sm p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Confirm {confirmAction.type === 'revoke' ? 'Revocation' : 'Reissue'}</h3>
              <button onClick={() => setConfirmAction(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to <strong>{confirmAction.type}</strong> certificate for <strong className="text-gray-900 dark:text-gray-100">{confirmAction.userName}</strong>?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button variant={confirmAction.type === 'revoke' ? 'danger' : 'primary'} onClick={handleAction} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {confirmAction.type === 'revoke' ? 'Revoke' : 'Reissue'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {showIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full max-w-lg p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Issue Certificate</h3>
              <button onClick={() => setShowIssue(false)}><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Search Student</label>
                <div className="relative">
                  <input
                    type="text" placeholder="Type name or email..."
                    value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setSelectedUser(null); setCompletedCourses([]); }}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  {searchingUsers && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                  )}
                </div>
                {userResults.length > 0 && !selectedUser && (
                  <div className="mt-1 border rounded-lg max-h-40 overflow-y-auto">
                    {userResults.map((u: any) => (
                      <button
                        key={u.id}
                        onClick={() => selectUser(u)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 border-b last:border-0"
                      >
                        <span className="font-medium">{u.name}</span>
                        <span className="text-gray-400 ml-2">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedUser && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Completed Course</label>
                  {loadingCourses ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading courses...
                    </div>
                  ) : completedCourses.length === 0 ? (
                    <p className="text-sm text-amber-600 py-2">No completed courses found for this student.</p>
                  ) : (
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="">Select a course...</option>
                      {completedCourses.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {issueError && (
                <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 text-sm text-danger-600 dark:text-danger-400">
                  <AlertCircle className="w-4 h-4 inline mr-1 -mt-0.5" />
                  {issueError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowIssue(false)}>Cancel</Button>
                <Button onClick={handleIssue} disabled={issuing || !selectedUser || !selectedCourseId}>
                  {issuing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Issue Certificate
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}