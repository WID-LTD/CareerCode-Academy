import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Eye, AlertCircle, X, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAdminStore } from '@/store/adminStore';

const TABS = ['all', 'pending', 'approved', 'rejected'];

export default function AdminApplications() {
  const { applications, isLoading, error, fetchApplications, approveApplication, rejectApplication } = useAdminStore();
  const [tab, setTab] = useState('all');
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const filtered = tab === 'all' ? applications : applications.filter((a) => a.status === tab);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    setActionLoading(true);
    try {
      if (status === 'approved') await approveApplication(id, reviewNotes);
      else await rejectApplication(id, reviewNotes);
      setSelectedApp(null);
      setReviewNotes('');
    } finally {
      setActionLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, any> = { pending: 'warning', approved: 'success', rejected: 'danger' };
    return <Badge variant={map[status] || 'default'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Instructor Applications</h1>
        <p className="text-gray-500 mt-1">Review and manage instructor applications.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
          <p className="text-sm text-danger-600 dark:text-danger-400 flex-1">{error}</p>
          <Button size="sm" onClick={() => fetchApplications()}>Retry</Button>
        </div>
      )}

      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${tab === t ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {t === 'all' ? 'All' : t}
            {t !== 'all' && (
              <span className="ml-1.5 text-[10px] opacity-60">
                ({applications.filter((a) => a.status === t).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 text-center py-16 text-gray-400">No applications found.</div>
        )}
        {filtered.map((app) => (
          <motion.div key={app._id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-5" hover>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center text-sm font-bold text-primary-500">
                    {app.full_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{app.full_name}</p>
                    <p className="text-xs text-gray-500">{app.email}</p>
                  </div>
                </div>
                {statusBadge(app.status)}
              </div>

              <div className="space-y-1.5 text-xs text-gray-500 mb-3">
                <p><span className="font-medium">Specialization:</span> {app.specialization || 'N/A'}</p>
                <p><span className="font-medium">Experience:</span> {app.years_experience} years</p>
                {app.qualifications && <p><span className="font-medium">Qualifications:</span> {app.qualifications}</p>}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setSelectedApp(app); setReviewNotes(''); }}>
                  <Eye className="w-3.5 h-3.5" /> Review
                </Button>
                {app.status === 'pending' && (
                  <>
                    <Button size="sm" variant="primary" className="flex-1" onClick={() => handleAction(app._id, 'approved')}>
                      <CheckCircle className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="danger" className="flex-1" onClick={() => setSelectedApp(app)}>
                      <XCircle className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Review Application</h3>
              <button onClick={() => setSelectedApp(null)}><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center text-lg font-bold text-primary-500">
                  {selectedApp.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-semibold">{selectedApp.full_name}</p>
                  <p className="text-xs text-gray-500">{selectedApp.email}</p>
                </div>
                {statusBadge(selectedApp.status)}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-xs text-gray-500">Specialization</p>
                  <p className="font-medium">{selectedApp.specialization || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-xs text-gray-500">Experience</p>
                  <p className="font-medium">{selectedApp.years_experience} years</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 col-span-2">
                  <p className="text-xs text-gray-500">Qualifications</p>
                  <p className="font-medium">{selectedApp.qualifications || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 col-span-2">
                  <p className="text-xs text-gray-500">Message</p>
                  <p className="font-medium">{selectedApp.message || 'No message'}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Review Notes</label>
                <textarea
                  value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes for the applicant..."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 outline-none focus:ring-2 focus:ring-primary-500/30 text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setSelectedApp(null)}>Close</Button>
              {selectedApp.status === 'pending' && (
                <>
                  <Button variant="primary" onClick={() => handleAction(selectedApp._id, 'approved')} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Approve
                  </Button>
                  <Button variant="danger" onClick={() => handleAction(selectedApp._id, 'rejected')} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Reject
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
