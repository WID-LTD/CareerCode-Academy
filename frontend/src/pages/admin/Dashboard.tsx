import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, DollarSign, Award, ArrowUp, Calendar, ArrowDown } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { useAdminStore } from '@/store/adminStore';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';

export default function AdminDashboard() {
  const { stats, recentUsers, recentPayments, monthlyRevenue, isLoading, fetchDashboardData } = useAdminStore();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const statCards = [
    {
      icon: Users,
      label: 'Students',
      value: stats?.totalStudents.toLocaleString() || '0',
      change: 'Active students',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      icon: Award,
      label: 'Instructors',
      value: stats?.totalInstructors.toLocaleString() || '0',
      change: 'Approved instructors',
      color: 'text-orange-500',
      bg: 'bg-orange-500/10'
    },
    {
      icon: BookOpen,
      label: 'Total Courses',
      value: stats?.totalCourses.toLocaleString() || '0',
      change: `${stats?.publishedCourses || 0} published`,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    },
    {
      icon: DollarSign,
      label: 'Revenue',
      value: stats?.totalRevenue ? `₦${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '₦0.00',
      change: 'Lifetime gross earnings',
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
  ];

  // Format monthly revenue for charts
  const revenueChartData = monthlyRevenue
    ? [...monthlyRevenue].reverse().map((row) => ({
        month: new Date(row.month).toLocaleDateString('default', { month: 'short', year: '2-digit' }),
        revenue: parseFloat(row.revenue),
        transactions: parseInt(row.transactions, 10),
      }))
    : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-500">Platform-wide analytics and overview.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <GlassCard key={stat.label} className="p-5" hover={false}>
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
            <div className="text-xs text-gray-400 mt-1">{stat.change}</div>
          </GlassCard>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <GlassCard className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Revenue Trend</h2>
            <Badge variant="primary" size="sm">Monthly breakdown</Badge>
          </div>
          {revenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-800" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip formatter={(value) => [`₦${parseFloat(value as string).toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revenueGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              No revenue transactions recorded yet.
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-4">Platform Info</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Average Course Price</span>
              <span className="font-medium">
                ₦{stats?.averagePrice ? stats.averagePrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0.00'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Enrollments</span>
              <span className="font-medium text-indigo-500">{stats?.totalEnrollments || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Server Status</span>
              <span className="font-medium text-green-500">Online</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">System Time</span>
              <span className="font-medium text-gray-400">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Enrollments & Users</h2>
          <div className="space-y-4">
            {recentUsers && recentUsers.length > 0 ? (
              recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 gradient-bg rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        {user.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                  <Badge variant={user.role === 'admin' ? 'danger' : user.role === 'instructor' ? 'primary' : 'default'} size="sm">
                    {user.role}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-400">No recent signups.</div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
          <div className="space-y-4">
            {recentPayments && recentPayments.length > 0 ? (
              recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{payment.course_title || 'Course Purchase'}</div>
                    <div className="text-xs text-gray-500 font-mono">{payment.reference}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-500">
                      ₦{parseFloat(payment.amount as any).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">{new Date(payment.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-400">No recent transactions.</div>
            )}
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}
