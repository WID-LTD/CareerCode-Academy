import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Loader2, AlertCircle, BarChart3, FileText, Users, DollarSign } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useAdminStore } from '@/store/adminStore';
import api from '@/lib/axios';

export default function AdminReports() {
  const { isLoading } = useAdminStore();
  const [exporting, setExporting] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');

  const handleExportEnrollments = async () => {
    setExporting('enrollments');
    setError('');
    try {
      const params: any = { format: 'csv' };
      if (status !== 'all') params.status = status;
      if (dateRange.from) params.dateFrom = dateRange.from;
      if (dateRange.to) params.dateTo = dateRange.to;

      const res = await api.post('/admin/enrollments/export', params, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enrollments-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const handleExportRevenue = async () => {
    setExporting('revenue');
    setError('');
    try {
      const { data } = await api.get('/admin/revenue');
      const rows = data.data;
      const header = 'Month,Revenue,Transactions';
      const csvRows = (rows.monthly || []).map((r: any) => `"${r.month}","${r.revenue}","${r.transactions}"`);
      const blob = new Blob([[header, ...csvRows].join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const handleExportUsers = async () => {
    setExporting('users');
    setError('');
    try {
      const { data } = await api.get('/admin/users?limit=10000');
      const users = data.data;
      const header = 'ID,Name,Email,Role,Verified,Joined';
      const csvRows = users.map((u: any) => `"${u.id}","${u.name}","${u.email}","${u.role}","${u.is_verified}","${u.created_at}"`);
      const blob = new Blob([[header, ...csvRows].join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const reports = [
    {
      title: 'Enrollment Report',
      desc: 'Export all enrollment data with filters as CSV.',
      icon: Users,
      color: 'text-primary-500',
      bg: 'bg-primary-50 dark:bg-primary-900/20',
      action: handleExportEnrollments,
      key: 'enrollments',
      extra: (
        <div className="flex gap-2 mt-3">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-xs rounded-lg bg-gray-100 dark:bg-gray-800 px-2 py-1 border-0 outline-none">
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} className="text-xs rounded-lg bg-gray-100 dark:bg-gray-800 px-2 py-1 border-0 outline-none" />
          <input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} className="text-xs rounded-lg bg-gray-100 dark:bg-gray-800 px-2 py-1 border-0 outline-none" />
        </div>
      ),
    },
    {
      title: 'Revenue Report',
      desc: 'Monthly revenue breakdown with transactions.',
      icon: DollarSign,
      color: 'text-success-500',
      bg: 'bg-success-50 dark:bg-success-900/20',
      action: handleExportRevenue,
      key: 'revenue',
    },
    {
      title: 'User Report',
      desc: 'All registered users with roles and status.',
      icon: Users,
      color: 'text-secondary-500',
      bg: 'bg-secondary-50 dark:bg-secondary-900/20',
      action: handleExportUsers,
      key: 'users',
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Reports</h1>
        <p className="text-gray-500 mt-1">Generate and download data reports.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger-500" />
          <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <GlassCard key={report.key} className="p-5" hover>
            <div className={`w-10 h-10 rounded-xl ${report.bg} flex items-center justify-center ${report.color} mb-3`}>
              <report.icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold mb-1">{report.title}</h3>
            <p className="text-xs text-gray-500 mb-3">{report.desc}</p>
            {report.extra}
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              onClick={report.action}
              disabled={exporting === report.key}
            >
              {exporting === report.key ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
              Export CSV
            </Button>
          </GlassCard>
        ))}
      </div>
    </motion.div>
  );
}
