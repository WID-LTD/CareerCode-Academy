import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Wallet, Banknote, CreditCard, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { usePayoutStore } from '@/store/payoutStore';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import toast from 'react-hot-toast';

export default function InstructorPayouts() {
  const { payouts, balance, isLoading, error, fetchPayouts, requestPayout } = usePayoutStore();
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentDetails, setPaymentDetails] = useState('');

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return toast.error('Please enter a valid amount');
    }
    if (!paymentDetails.trim()) {
      return toast.error('Please provide payment details');
    }
    try {
      await requestPayout(numAmount, paymentMethod, paymentDetails);
      toast.success('Payout requested successfully!');
      setShowForm(false);
      setAmount('');
      setPaymentDetails('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to request payout');
    }
  };

  if (isLoading && payouts.length === 0) {
    return <PageSkeleton />;
  }

  if (error && payouts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-danger-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load payouts</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={() => fetchPayouts()}><RefreshCw className="w-4 h-4 mr-2" /> Retry</Button>
        </div>
      </div>
    );
  }

  const statusBadge: Record<string, 'warning' | 'primary' | 'success' | 'danger'> = {
    pending: 'warning',
    approved: 'primary',
    paid: 'success',
    rejected: 'danger',
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Payouts</h1>
          <p className="text-gray-500 mt-1">Manage your earnings and withdrawal requests.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
          disabled={!balance || balance.availableBalance <= 0}
        >
          <Plus className="w-5 h-5 mr-2" />
          Request Payout
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5" hover={false}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <div className="text-2xl font-bold">${balance?.totalRevenue.toLocaleString() || '0'}</div>
          <div className="text-sm text-gray-500">Total Revenue</div>
        </GlassCard>
        <GlassCard className="p-5" hover={false}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <div className="text-2xl font-bold">${balance?.availableBalance.toLocaleString() || '0'}</div>
          <div className="text-sm text-gray-500">Available Balance</div>
        </GlassCard>
        <GlassCard className="p-5" hover={false}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <div className="text-lg font-bold">{balance?.commissionRate || 30}%</div>
          <div className="text-sm text-gray-500">Platform Commission</div>
        </GlassCard>
        <GlassCard className="p-5" hover={false}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <div className="text-2xl font-bold">${balance?.totalPaid.toLocaleString() || '0'}</div>
          <div className="text-sm text-gray-500">Total Paid Out</div>
        </GlassCard>
      </div>

      {/* Request Form */}
      {showForm && (
        <GlassCard className="p-6 border-primary-500/30">
          <h2 className="text-lg font-semibold mb-4">Request Payout</h2>
          <form onSubmit={handleRequest} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium mb-1">Amount ($)</label>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                max={balance?.availableBalance || 0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                placeholder="0.00"
              />
              {balance && (
                <p className="text-xs text-gray-500 mt-1">Available: ${balance.availableBalance.toLocaleString()}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="paypal">PayPal</option>
                <option value="mobile_money">Mobile Money</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Details</label>
              <textarea
                required
                rows={3}
                value={paymentDetails}
                onChange={(e) => setPaymentDetails(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 resize-none"
                placeholder="Bank account details, PayPal email, or mobile money number..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? 'Requesting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Payout History */}
      <GlassCard className="p-6" hover={false}>
        <h2 className="text-lg font-semibold mb-4">Payout History</h2>
        <div className="space-y-3">
          {payouts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No payout requests yet.</p>
            </div>
          ) : (
            payouts.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div>
                  <div className="font-medium">${parseFloat(p.amount).toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {p.payment_method?.replace('_', ' ')} — {new Date(p.requested_at).toLocaleDateString()}
                  </div>
                  {p.admin_notes && (
                    <p className="text-xs text-gray-400 mt-1">Note: {p.admin_notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant={statusBadge[p.status] || 'default'} size="sm">
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </Badge>
                  {p.fee > 0 && (
                    <div className="text-[10px] text-gray-400 mt-1">Fee: ${parseFloat(p.fee).toFixed(2)}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}