import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Users, GraduationCap, BookOpen, DollarSign, Award, TrendingUp,
  UserPlus, FileText, Clock, BarChart3, ChevronRight, RefreshCw,
  AlertCircle, Activity, Zap, Wifi, ArrowUpRight, ArrowDownRight,
  ExternalLink, Bell, MessageSquare, Download, Play,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, ComposedChart, Legend,
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAdminStore } from '@/store/adminStore';
import { useSocket } from '@/hooks/useSocket';

const statCards = [
  { key: 'totalStudents', label: 'Total Students', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', link: '/admin/users', trendKey: 'totalStudents' },
  { key: 'totalInstructors', label: 'Instructors', icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-500/10', link: '/admin/users', trendKey: 'totalInstructors' },
  { key: 'pendingApplications', label: 'Pending Applications', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10', link: '/admin/applications' },
  { key: 'totalCourses', label: 'Total Courses', icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-500/10', link: '/admin/courses' },
  { key: 'publishedCourses', label: 'Published', icon: TrendingUp, color: 'text-success-500', bg: 'bg-success-500/10', link: '/admin/courses' },
  { key: 'totalEnrollments', label: 'Enrollments', icon: UserPlus, color: 'text-cyan-500', bg: 'bg-cyan-500/10', link: '/admin/courses', trendKey: 'totalEnrollments' },
  { key: 'activeUsers', label: 'Active Users', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10', link: '/admin/users' },
  { key: 'certificatesIssued', label: 'Certificates', icon: Award, color: 'text-rose-500', bg: 'bg-rose-500/10', link: '/admin/certificates' },
  { key: 'monthlyRevenue', label: 'Monthly Revenue', icon: DollarSign, color: 'text-yellow-500', bg: 'bg-yellow-500/10', format: 'currency', trendKey: 'totalRevenue' },
  { key: 'totalRevenue', label: 'Total Revenue', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10', format: 'currency' },
];

const quickActions = [
  { label: 'New Course', path: '/admin/courses', icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { label: 'View Applications', path: '/admin/applications', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { label: 'Send Broadcast', path: '/admin/broadcasts', icon: Bell, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { label: 'Export Report', path: '/admin/reports', icon: Download, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { label: 'View Tickets', path: '/admin/tickets', icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 text-sm shadow-xl border border-white/20 dark:border-gray-800/50">
        <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="text-xs font-medium">
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const { stats, recentUsers, recentPayments, monthlyRevenue, refundTrend, enrollmentTrend, userRegistrationTrend, topCourses, isLoading, error, fetchDashboardData } = useAdminStore();
  const { onlineCount, onlineUsers } = useSocket();
  const [timeRange, setTimeRange] = useState('6m');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRef = useRef<ReturnType<typeof setInterval>>();

  const loadData = useCallback((range?: string) => {
    fetchDashboardData(range || timeRange);
  }, [fetchDashboardData, timeRange]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      autoRef.current = setInterval(() => loadData(), 30000);
      return () => { if (autoRef.current) clearInterval(autoRef.current); };
    } else {
      if (autoRef.current) clearInterval(autoRef.current);
    }
  }, [autoRefresh, loadData]);

  const handleRangeChange = (range: string) => {
    setTimeRange(range);
    loadData(range);
  };

  const formatValue = (key: string, value: any) => {
    if (key === 'monthlyRevenue' || key === 'totalRevenue') {
      return `$${(value || 0).toLocaleString()}`;
    }
    return (value || 0).toLocaleString();
  };

  const TrendBadge = ({ trend }: { trend: number | undefined }) => {
    if (trend === undefined || trend === 0) return null;
    const isUp = trend > 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${isUp ? 'text-success-500' : 'text-danger-500'}`}>
        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {Math.abs(trend)}%
      </span>
    );
  };

  const mergedRevenue = monthlyRevenue.map((m: any) => {
    const refund = refundTrend.find((r: any) => r.date === m.date);
    return { ...m, refunds: refund?.refunds || 0 };
  });

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.03 } },
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Platform overview and key metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${autoRefresh ? 'bg-success-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
          >
            {autoRefresh ? 'Live' : 'Auto'}
          </button>
          <select
            value={timeRange}
            onChange={(e) => handleRangeChange(e.target.value)}
            className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 text-sm border-0 outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="6m">Last 6 months</option>
            <option value="1y">Last year</option>
          </select>
          <Button variant="ghost" size="sm" onClick={() => loadData()}><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /></Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
          <p className="text-sm text-danger-600 dark:text-danger-400 flex-1">{error}</p>
          <Button size="sm" onClick={() => loadData()}>Retry</Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !stats ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6"><div className="h-72 rounded-2xl bg-gray-200 dark:bg-gray-700" /><div className="h-72 rounded-2xl bg-gray-200 dark:bg-gray-700" /></div>
          <div className="grid lg:grid-cols-3 gap-6"><div className="h-52 rounded-2xl bg-gray-200 dark:bg-gray-700" /><div className="h-52 rounded-2xl bg-gray-200 dark:bg-gray-700" /><div className="h-52 rounded-2xl bg-gray-200 dark:bg-gray-700" /></div>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Live Online Users */}
            <motion.div variants={item}>
              <GlassCard className="p-4 group cursor-default" hover>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success-500/10 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Wifi className="w-5 h-5 text-success-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold flex items-center gap-2">
                      {onlineCount}
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500" />
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">Online Now</div>
                    {onlineUsers.length > 0 && (
                      <div className="flex -space-x-1.5 mt-1">
                        {onlineUsers.slice(0, 5).map((u: any) => (
                          <div key={u.id} className="w-5 h-5 rounded-full bg-primary-500/20 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[8px] font-bold text-primary-600" title={u.name || u.id}>
                            {(u.name || '?').charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {onlineUsers.length > 5 && (
                          <div className="w-5 h-5 rounded-full bg-gray-200 dark:border-gray-900 border-2 flex items-center justify-center text-[8px] font-bold text-gray-500">
                            +{onlineUsers.length - 5}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {statCards.map((stat, i) => {
              const Icon = stat.icon;
              const value = stats ? (stats as any)[stat.key] : 0;
              const trends = stats?.trends;
              const trend = stat.trendKey ? (trends as any)?.[stat.trendKey] : undefined;
              return (
                <motion.div key={stat.key} variants={item}>
                  <Link to={stat.link || '#'} className="block">
                    <GlassCard className="p-4 group cursor-pointer" hover>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                          <Icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-lg font-bold flex items-center gap-2">
                            {formatValue(stat.key, value)}
                            {trend !== undefined && trend !== 0 && (
                              <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${trend > 0 ? 'text-success-500' : 'text-danger-500'}`}>
                                {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(trend)}%
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{stat.label}</div>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <motion.div variants={item}>
            <GlassCard className="p-4" hover={false}>
              <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                <Zap className="w-4 h-4 text-amber-500" /> Quick Actions
              </div>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.label} to={action.path}>
                      <Button size="sm" variant="outline" className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${action.color}`} />
                        {action.label}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Enrollment Trend */}
            <motion.div variants={item}>
              <GlassCard className="p-5" hover={false}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary-500" />
                  Enrollment Trend
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={enrollmentTrend.length > 0 ? enrollmentTrend : [
                      { label: 'Jan', enrollments: 45 }, { label: 'Feb', enrollments: 62 },
                      { label: 'Mar', enrollments: 58 }, { label: 'Apr', enrollments: 87 },
                      { label: 'May', enrollments: 94 }, { label: 'Jun', enrollments: 112 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-gray-500" />
                      <YAxis tick={{ fontSize: 12 }} className="text-gray-500" />
                      <Tooltip content={<CustomTooltip />} />
                      <defs>
                        <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="enrollments" name="Enrollments" stroke="#6366f1" fill="url(#enrollGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>

            {/* Revenue vs Refunds */}
            <motion.div variants={item}>
              <GlassCard className="p-5" hover={false}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-success-500" />
                  Revenue vs Refunds
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={mergedRevenue.length > 0 ? mergedRevenue : [
                      { label: 'Jan', revenue: 12000, refunds: 200 }, { label: 'Feb', revenue: 18500, refunds: 450 },
                      { label: 'Mar', revenue: 15800, refunds: 300 }, { label: 'Apr', revenue: 22400, refunds: 600 },
                      { label: 'May', revenue: 19600, refunds: 250 }, { label: 'Jun', revenue: 28700, refunds: 500 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-gray-500" />
                      <YAxis tick={{ fontSize: 12 }} className="text-gray-500" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} fill="#10B981" />
                      <Line type="monotone" dataKey="refunds" name="Refunds" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Bottom Row */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* User Registration Trend */}
            <motion.div variants={item}>
              <GlassCard className="p-5" hover={false}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-purple-500" />
                  New Registrations
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={userRegistrationTrend.length > 0 ? userRegistrationTrend : [
                      { label: 'Mon', users: 12 }, { label: 'Tue', users: 18 }, { label: 'Wed', users: 15 },
                      { label: 'Thu', users: 22 }, { label: 'Fri', users: 19 }, { label: 'Sat', users: 8 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-gray-500" />
                      <YAxis tick={{ fontSize: 11 }} className="text-gray-500" />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="users" name="Users" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>

            {/* Top Courses */}
            <motion.div variants={item}>
              <GlassCard className="p-5" hover={false}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-500" />
                  Top Courses
                </h3>
                <div className="space-y-3">
                  {(topCourses.length > 0 ? topCourses : [
                    { title: 'Advanced React', enrollments: 234 },
                    { title: 'TypeScript Masterclass', enrollments: 189 },
                    { title: 'Python Data Science', enrollments: 156 },
                    { title: 'Cloud Architecture', enrollments: 98 },
                  ]).slice(0, 6).map((course: any, i: number) => {
                    const max = Math.max(...(topCourses.length > 0 ? topCourses.map((c: any) => c.enrollments) : [234, 189, 156, 98]));
                    const pct = Math.max(4, ((course.enrollments || 0) / max) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className={`text-xs font-bold w-5 ${i < 3 ? 'text-primary-500' : 'text-gray-400'}`}>#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">{course.title}</p>
                            <span className="text-xs text-gray-500 ml-2">{course.enrollments}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-cyan-500 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>

            {/* Recent Payments & Activity */}
            <motion.div variants={item}>
              <GlassCard className="p-5" hover={false}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-500" />
                  Recent Payments
                </h3>
                <div className="space-y-2">
                  {recentPayments.slice(0, 5).map((payment: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm py-1">
                      <div className="w-7 h-7 rounded-full bg-success-500/10 flex items-center justify-center text-[10px] font-bold text-success-600 flex-shrink-0">
                        {(payment.user?.name || '?').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{payment.user?.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{payment.course?.title}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-success-600">+${Number(payment.amount || 0).toLocaleString()}</p>
                        <p className="text-[9px] text-gray-400">{new Date(payment.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {recentPayments.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-6">No payments yet</p>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Recent Activity Feed */}
          <motion.div variants={item}>
            <GlassCard className="p-5" hover={false}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" />
                Recent Activity
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">New Users</p>
                  <div className="space-y-2">
                    {recentUsers.slice(0, 5).map((user: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center text-xs font-bold text-primary-500 flex-shrink-0">
                          {user.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{user.role} joined</p>
                        </div>
                        <span className="text-[10px] text-gray-400">{new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                    {recentUsers.length === 0 && <p className="text-sm text-gray-400 text-center py-3">No activity</p>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Audit Trail</p>
                  <div className="space-y-2">
                    {(() => {
                      const activities = recentUsers.length > 0 ? recentUsers : [];
                      return activities.length > 0 ? activities.slice(0, 5).map((user: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-bold text-amber-500 flex-shrink-0">
                            {user.name?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{user.name}</p>
                            <p className="text-[10px] text-gray-400 capitalize">{user.role}</p>
                          </div>
                          <span className="text-[10px] text-gray-400">{new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                      )) : <p className="text-sm text-gray-400 text-center py-3">No recent activity</p>;
                    })()}
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
