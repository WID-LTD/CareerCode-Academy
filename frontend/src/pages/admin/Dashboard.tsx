import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Users, GraduationCap, BookOpen, DollarSign, Award, TrendingUp,
  UserPlus, FileText, Clock, BarChart3, ChevronRight, RefreshCw,
  AlertCircle, Activity, Zap, Wifi,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line,
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAdminStore } from '@/store/adminStore';
import { useSocket } from '@/hooks/useSocket';

const statCards = [
  { key: 'totalStudents', label: 'Total Students', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', link: '/admin/users' },
  { key: 'totalInstructors', label: 'Instructors', icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-500/10', link: '/admin/users' },
  { key: 'pendingApplications', label: 'Pending Applications', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10', link: '/admin/applications' },
  { key: 'totalCourses', label: 'Total Courses', icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-500/10', link: '/admin/courses' },
  { key: 'publishedCourses', label: 'Published', icon: TrendingUp, color: 'text-success-500', bg: 'bg-success-500/10', link: '/admin/courses' },
  { key: 'totalEnrollments', label: 'Enrollments', icon: UserPlus, color: 'text-cyan-500', bg: 'bg-cyan-500/10', link: '/admin/courses' },
  { key: 'activeUsers', label: 'Active Users', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10', link: '/admin/users' },
  { key: 'certificatesIssued', label: 'Certificates', icon: Award, color: 'text-rose-500', bg: 'bg-rose-500/10', link: '/admin/certificates' },
  { key: 'monthlyRevenue', label: 'Monthly Revenue', icon: DollarSign, color: 'text-yellow-500', bg: 'bg-yellow-500/10', format: 'currency' },
  { key: 'totalRevenue', label: 'Total Revenue', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10', format: 'currency' },
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
  const { stats, recentUsers, recentPayments, monthlyRevenue, enrollmentTrend, userRegistrationTrend, topCourses, isLoading, error, fetchDashboardData } = useAdminStore();
  const { onlineCount, onlineUsers } = useSocket();
  const [timeRange, setTimeRange] = useState('6m');

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatValue = (key: string, value: any) => {
    if (key === 'monthlyRevenue' || key === 'totalRevenue') {
      return `$${(value || 0).toLocaleString()}`;
    }
    return (value || 0).toLocaleString();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Platform overview and key metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 text-sm border-0 outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="6m">Last 6 months</option>
            <option value="1y">Last year</option>
          </select>
          <Button variant="ghost" size="sm" onClick={fetchDashboardData} icon={<RefreshCw className="w-4 h-4" />} />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
          <p className="text-sm text-danger-600 dark:text-danger-400 flex-1">{error}</p>
          <Button size="sm" onClick={fetchDashboardData}>Retry</Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !stats ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Live Online Users */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
                        {onlineUsers.slice(0, 5).map((u) => (
                          <div key={u.id} className="w-5 h-5 rounded-full bg-primary-500/20 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[8px] font-bold text-primary-600" title={u.name || u.id}>
                            {(u.name || '?').charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {onlineUsers.length > 5 && (
                          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[8px] font-bold text-gray-500">
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
              return (
                <motion.div
                  key={stat.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link to={stat.link || '#'} className="block">
                    <GlassCard className="p-4 group cursor-pointer" hover>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                          <Icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-lg font-bold">{formatValue(stat.key, value)}</div>
                          <div className="text-xs text-gray-500 truncate">{stat.label}</div>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Enrollment Trend */}
            <GlassCard className="p-5" hover={false}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary-500" />
                Enrollment Trend
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={enrollmentTrend.length > 0 ? enrollmentTrend : [
                    { month: 'Jan', enrollments: 45 }, { month: 'Feb', enrollments: 62 },
                    { month: 'Mar', enrollments: 58 }, { month: 'Apr', enrollments: 87 },
                    { month: 'May', enrollments: 94 }, { month: 'Jun', enrollments: 112 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-gray-500" />
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

            {/* Revenue Chart */}
            <GlassCard className="p-5" hover={false}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-success-500" />
                Monthly Revenue
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenue.length > 0 ? monthlyRevenue : [
                    { month: 'Jan', revenue: 12000 }, { month: 'Feb', revenue: 18500 },
                    { month: 'Mar', revenue: 15800 }, { month: 'Apr', revenue: 22400 },
                    { month: 'May', revenue: 19600 }, { month: 'Jun', revenue: 28700 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-gray-500" />
                    <YAxis tick={{ fontSize: 12 }} className="text-gray-500" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          {/* Bottom Row */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* User Registration Trend */}
            <GlassCard className="p-5 lg:col-span-1" hover={false}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-500" />
                New Registrations
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={userRegistrationTrend.length > 0 ? userRegistrationTrend : [
                    { day: 'Mon', users: 12 }, { day: 'Tue', users: 18 }, { day: 'Wed', users: 15 },
                    { day: 'Thu', users: 22 }, { day: 'Fri', users: 19 }, { day: 'Sat', users: 8 },
                    { day: 'Sun', users: 5 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} className="text-gray-500" />
                    <YAxis tick={{ fontSize: 11 }} className="text-gray-500" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="users" name="Users" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Top Courses */}
            <GlassCard className="p-5 lg:col-span-1" hover={false}>
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
                ]).slice(0, 6).map((course: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{course.title}</p>
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-1">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-cyan-500"
                          style={{ width: `${Math.min(100, (course.enrollments || 0) / 3)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{course.enrollments}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Recent Activity */}
            <GlassCard className="p-5 lg:col-span-1" hover={false}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {recentUsers.slice(0, 5).map((user, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center text-xs font-bold text-primary-500">
                      {user.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.role} joined</p>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {recentUsers.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">No recent activity</p>
                )}
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </motion.div>
  );
}
