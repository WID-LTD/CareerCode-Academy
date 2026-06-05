import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, DollarSign, Download, Filter, CheckCircle, Clock, XCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const payments = [
  { id: 'PAY-001', user: 'Sarah Johnson', email: 'sarah@example.com', amount: 2499, plan: 'Pro (Annual)', status: 'completed', date: '2025-06-01', method: 'Credit Card' },
  { id: 'PAY-002', user: 'Michael Chen', email: 'michael@example.com', amount: 199, plan: 'Enterprise (Monthly)', status: 'completed', date: '2025-05-30', method: 'PayPal' },
  { id: 'PAY-003', user: 'Emma Wilson', email: 'emma@example.com', amount: 2499, plan: 'Pro (Annual)', status: 'pending', date: '2025-05-28', method: 'Credit Card' },
  { id: 'PAY-004', user: 'James Wilson', email: 'james@example.com', amount: 0, plan: 'Starter', status: 'completed', date: '2025-05-25', method: 'Free' },
  { id: 'PAY-005', user: 'Lisa Anderson', email: 'lisa@example.com', amount: 499, plan: 'Pro (Monthly)', status: 'failed', date: '2025-05-22', method: 'Credit Card' },
  { id: 'PAY-006', user: 'David Brown', email: 'david@example.com', amount: 2499, plan: 'Pro (Annual)', status: 'completed', date: '2025-05-20', method: 'PayPal' },
  { id: 'PAY-007', user: 'Tech Corp Inc.', email: 'billing@techcorp.com', amount: 9999, plan: 'Enterprise (Annual)', status: 'completed', date: '2025-05-15', method: 'Bank Transfer' },
];

export default function Payments() {
  const [search, setSearch] = useState('');

  const filtered = payments.filter(p => p.user.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()));

  const totalRevenue = payments.reduce((sum, p) => p.status === 'completed' ? sum + p.amount : sum, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Payments</h1>
          <p className="text-gray-500">Track and manage all transactions.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm text-gray-500">Total Revenue</div>
            <div className="text-2xl font-bold gradient-text">${totalRevenue.toLocaleString()}</div>
          </div>
          <Button variant="outline" icon={<Download className="w-4 h-4" />}>Export</Button>
        </div>
      </div>

      <div className="mb-6">
        <Input icon={<Search className="w-4 h-4" />} placeholder="Search by user or transaction ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left pb-3 pl-3">Transaction</th>
              <th className="text-left pb-3">User</th>
              <th className="text-left pb-3">Plan</th>
              <th className="text-left pb-3">Amount</th>
              <th className="text-left pb-3">Method</th>
              <th className="text-left pb-3">Status</th>
              <th className="text-left pb-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {filtered.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="py-3 pl-3 text-sm font-mono text-gray-500">{payment.id}</td>
                <td className="py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{payment.user}</div>
                    <div className="text-xs text-gray-500">{payment.email}</div>
                  </div>
                </td>
                <td className="py-3 text-sm text-gray-500">{payment.plan}</td>
                <td className="py-3 text-sm font-semibold text-gray-900 dark:text-white">${payment.amount.toLocaleString()}</td>
                <td className="py-3 text-sm text-gray-500">{payment.method}</td>
                <td className="py-3">
                  <Badge variant={payment.status === 'completed' ? 'success' : payment.status === 'pending' ? 'warning' : 'danger'} size="sm">
                    {payment.status}
                  </Badge>
                </td>
                <td className="py-3 text-sm text-gray-500">{payment.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
