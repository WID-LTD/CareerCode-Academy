import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Download, RefreshCw, DollarSign, TrendingUp, AlertCircle,
  ArrowUpRight, ArrowDownRight, Loader2, RotateCcw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAdminStore } from '@/store/adminStore';

const COLORS = ['#6366f1', '#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 text-sm shadow-xl">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="text-xs font-medium">
            {entry.name}: ${typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminPayments() {
  const { payments, isLoading, error, fetchPayments, refundPayment } = useAdminStore();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const filtered = payments
    .filter((p) => status === 'all' || p.status === status)
    .filter((p) => !search || p.user?.name?.toLowerCase().includes(search.toLowerCase()) || p.course?.title?.toLowerCase().includes(search.toLowerCase()));

  const amount = (p: any) => Number(p.amount || 0);
  const totalRevenue = payments.reduce((sum, p) => sum + amount(p), 0);
  const successfulAmount = payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + amount(p), 0);
  const pendingAmount = payments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + amount(p), 0);
  const refundedAmount = payments.filter((p) => p.status === 'refunded').reduce((sum, p) => sum + amount(p), 0);

  const revenueByMethod = [
    { name: 'Card', value: successfulAmount * 0.6 },
    { name: 'PayPal', value: successfulAmount * 0.25 },
    { name: 'Crypto', value: successfulAmount * 0.1 },
    { name: 'Other', value: successfulAmount * 0.05 },
  ];

  const monthlyData = [
    { month: 'Jan', revenue: 12000, refunds: 400 },
    { month: 'Feb', revenue: 18500, refunds: 600 },
    { month: 'Mar', revenue: 15800, refunds: 350 },
    { month: 'Apr', revenue: 22400, refunds: 800 },
    { month: 'May', revenue: 19600, refunds: 500 },
    { month: 'Jun', revenue: 28700, refunds: 700 },
  ];

  const handleRefund = async (id: string) => {
    if (!confirm('Refund this payment? This action cannot be undone.')) return;
    await refundPayment(id);
  };

  const statusBadge = (s: string) => {
    const map: Record<string, any> = { completed: 'success', pending: 'warning', failed: 'danger', refunded: 'info' };
    return <Badge variant={map[s] || 'default'}>{s}</Badge>;
  };

  const handleExport = () => {
    const csv = [['ID', 'User', 'Course', 'Amount', 'Status', 'Date'].join(',')];
    filtered.forEach((p) => csv.push([p._id, p.user?.name, p.course?.title, p.amount, p.status, new Date(p.created_at).toISOString()].join(',')));
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Payments</h1>
          <p className="text-gray-500 mt-1">Transaction history and revenue analytics.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExport}>Export CSV</Button>
          <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => fetchPayments()} />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
          <p className="text-sm text-danger-600 dark:text-danger-400 flex-1">{error}</p>
          <Button size="sm" onClick={() => fetchPayments()}>Retry</Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassCard className="p-4" hover>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-500" /></div>
            <div>
              <div className="text-lg font-bold">${totalRevenue.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Total Revenue</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4" hover>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-blue-500" /></div>
            <div>
              <div className="text-lg font-bold">${successfulAmount.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Successful</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4" hover>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><ArrowUpRight className="w-5 h-5 text-amber-500" /></div>
            <div>
              <div className="text-lg font-bold">${pendingAmount.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4" hover>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center"><ArrowDownRight className="w-5 h-5 text-rose-500" /></div>
            <div>
              <div className="text-lg font-bold">${refundedAmount.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Refunded</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <GlassCard className="p-5" hover={false}>
          <h3 className="text-sm font-semibold mb-4">Monthly Revenue vs Refunds</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-gray-500" />
                <YAxis tick={{ fontSize: 11 }} className="text-gray-500" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]} fill="#10B981" />
                <Bar dataKey="refunds" name="Refunds" radius={[4, 4, 0, 0]} fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        <GlassCard className="p-5" hover={false}>
          <h3 className="text-sm font-semibold mb-4">Revenue by Method</h3>
          <div className="h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueByMethod} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {revenueByMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 text-xs">
              {revenueByMethod.map((m, i) => (
                <div key={m.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span>{m.name}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search user or course..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 outline-none focus:ring-2 focus:ring-primary-500/30 text-sm"
          />
        </div>
        <select
          value={status} onChange={(e) => setStatus(e.target.value)}
          className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm border-0 outline-none"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Table */}
      <GlassCard className="overflow-hidden" hover={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Course</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((payment) => (
                <tr key={payment._id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-500/10 flex items-center justify-center text-[10px] font-bold text-primary-500">
                        {payment.user?.name?.charAt(0) || '?'}
                      </div>
                      <span className="font-medium">{payment.user?.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-500 max-w-[200px] truncate">{payment.course?.title || 'N/A'}</td>
                  <td className="p-3 font-medium">${Number(payment.amount || 0).toFixed(2)}</td>
                  <td className="p-3">{statusBadge(payment.status)}</td>
                  <td className="p-3 text-gray-500 text-xs">{new Date(payment.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    {payment.status === 'completed' && (
                      <Button size="sm" variant="ghost" onClick={() => handleRefund(payment._id)}><RotateCcw className="w-3.5 h-3.5 text-amber-500" /></Button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-12 text-center text-gray-400">No payments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </motion.div>
  );
}
