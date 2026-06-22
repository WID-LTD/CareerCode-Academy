import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Wallet, RefreshCw, AlertCircle, CheckCircle, XCircle, Send } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { usePayoutStore } from '@/store/payoutStore';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import toast from 'react-hot-toast';

export default function AdminPayouts() {
  const { adminPayouts, adminStats, isLoading, error, fetchAdminPayouts, approvePayout, markPaidPayout, rejectPayout } = usePayoutStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminPayouts(1, statusFilter);
  }, [fetchAdminPayouts, statusFilter]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await approvePayout(id);
      toast.success('Payout approved');
    } catch { toast.error('Failed to approve payout'); }
    finally { setActionLoading(null); }
  };

  const handleMarkPaid = async (id: string) => {
    setActionLoading(id);
    try {
      await markPaidPayout(id);
      toast.success('Payout marked as paid');
    } catch { toast.error('Failed to mark payout as paid'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setActionLoading(id);
    try {
      await rejectPayout(id, rejectReason);
      toast.success('Payout rejected');
      setRejectId(null);
      setRejectReason('');
    } catch { toast.error('Failed to reject payout'); }
    finally { setActionLoading(null); }
  };

  if (isLoading && adminPayouts.length === 0) {
    return <PageSkeleton />;
  }

  const statusBadge: Record<string, 'warning' | 'primary' | 'success' | 'danger'> = {
    pending: 'warning',
    approved: 'primary',
    paid: 'success',
    rejected: 'danger',
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Payout Management</h1>
          <p className="text-gray-500 mt-1">Review and process instructor payout requests.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 text-sm border-0 outline-none"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
          </select>
          <Button variant="ghost" size="sm" onClick={() => fetchAdminPayouts(1, statusFilter)}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
          <p className="text-sm text-danger-600 dark:text-danger-400 flex-1">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GlassCard className="p-4" hover={false}>
          <div className="text-lg font-bold text-amber-500">${parseFloat(adminStats?.pending_total || '0').toLocaleString()}</div>
          <div className="text-xs text-gray-500">Pending Total</div>
        </GlassCard>
        <GlassCard className="p-4" hover={false}>
          <div className="text-lg font-bold text-blue-500">${parseFloat(adminStats?.approved_total || '0').toLocaleString()}</div>
          <div className="text-xs text-gray-500">Approved Total</div>
        </GlassCard>
        <GlassCard className="p-4" hover={false}>
          <div className="text-lg font-bold text-green-500">${parseFloat(adminStats?.paid_total || '0').toLocaleString()}</div>
          <div className="text-xs text-gray-500">Paid Total</div>
        </GlassCard>
        <GlassCard className="p-4" hover={false}>
          <div className="text-lg font-bold text-purple-500">{adminStats?.pending_count || 0}</div>
          <div className="text-xs text-gray-500">Pending Requests</div>
        </GlassCard>
      </div>

      {/* Payout List */}
      <GlassCard className="p-6" hover={false}>
        <h2 className="text-lg font-semibold mb-4">Payout Requests</h2>
        {adminPayouts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No payout requests found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {adminPayouts.map((p: any) => (
              <div key={p.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">${parseFloat(p.amount).toLocaleString()}</span>
                      <Badge variant={statusBadge[p.status] || 'default'} size="sm">
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{p.instructor_name} ({p.instructor_email})</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.payment_method?.replace('_', ' ')} — Requested {new Date(p.requested_at).toLocaleDateString()}
                    </p>
                    {p.payment_details && (
                      <p className="text-xs text-gray-400 mt-1 font-mono">{p.payment_details}</p>
                    )}
                    {p.admin_notes && (
                      <p className="text-xs text-gray-500 mt-1 italic">Note: {p.admin_notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleApprove(p.id)}
                          disabled={actionLoading === p.id}
                        >
                          {actionLoading === p.id ? '...' : <><CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve</>}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectId(rejectId === p.id ? null : p.id)}
                          className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    {p.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleMarkPaid(p.id)}
                        disabled={actionLoading === p.id}
                      >
                        {actionLoading === p.id ? '...' : <><Send className="w-3.5 h-3.5 mr-1" /> Mark Paid</>}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Reject Reason */}
                {rejectId === p.id && (
                  <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30">
                    <label className="block text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                      Rejection Reason
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Enter reason for rejection..."
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900 text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 border-red-200"
                        onClick={() => handleReject(p.id)}
                        disabled={actionLoading === p.id}
                      >
                        {actionLoading === p.id ? '...' : 'Confirm'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setRejectId(null); setRejectReason(''); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}