import { useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Users, DollarSign, TrendingUp, Star, Activity, RefreshCw,
  AlertCircle, GraduationCap, MessageSquare, Calendar, Clock, Zap,
  ChevronRight, BookMarked, UserPlus, BarChart3, ListChecks,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useInstructorStore } from '@/store/instructorStore';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/hooks/useSocket';
import { StatsSkeleton, CardSkeleton, ChartSkeleton } from '@/components/student/SkeletonLoader';

const quickActions = [
  { label: 'New Course', path: '/instructor/courses/new', icon: BookMarked, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: 'View Students', path: '/instructor/students', icon: UserPlus, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { label: 'Schedule', path: '/instructor/schedule', icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { label: 'Messages', path: '/instructor/messages', icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
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

export default function InstructorDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const {
    stats, topCourses, recentActivity, enrollmentTrend, monthlyRevenue,
    isLoading, error, fetchDashboardStats,
  } = useInstructorStore();

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchDashboardStats();
    socket.on('instructor:dashboard:update', handler);
    return () => { socket.off('instructor:dashboard:update', handler); };
  }, [socket, fetchDashboardStats]);

  if (isLoading && !stats) {
    return (
      <div className="space-y-8" role="status" aria-label="Loading dashboard">
        <div className="mb-8">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse" />
        </div>
        <StatsSkeleton />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <CardSkeleton />
            <ChartSkeleton />
          </div>
          <div className="space-y-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && error && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-danger-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={fetchDashboardStats}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const statCards = [
    { icon: BookOpen, label: 'Active Courses', value: stats?.activeCourses?.toString() || '0', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: Users, label: 'Total Students', value: stats?.totalStudents?.toString() || '0', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { icon: DollarSign, label: 'Revenue', value: `$${(stats?.totalRevenue || 0).toLocaleString()}`, color: 'text-green-500', bg: 'bg-green-500/10' },
    { icon: TrendingUp, label: 'Avg Rating', value: stats?.averageRating || '0', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.03 } },
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Header */}
      <motion.div variants={item}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Instructor Dashboard</h1>
            <p className="text-gray-500 mt-1">Welcome back, {user?.name || 'Instructor'}! Here's your overview.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchDashboardStats}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div variants={item} className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
          <p className="text-sm text-danger-600 dark:text-danger-400 flex-1">{error}</p>
          <Button size="sm" onClick={fetchDashboardStats}>Retry</Button>
        </motion.div>
      )}

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        {/* Stat Cards */}
        <motion.div variants={item} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <GlassCard key={stat.label} className="p-5" hover={false}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </GlassCard>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={item}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800 transition-all bg-white/50 dark:bg-gray-900/50"
              >
                <div className={`w-9 h-9 rounded-lg ${action.bg} flex items-center justify-center flex-shrink-0`}>
                  <action.icon className={`w-4 h-4 ${action.color}`} />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <motion.div variants={item}>
            <GlassCard className="p-5" hover={false}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                Revenue (Last 6 Months)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenue.length > 0 ? monthlyRevenue : []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short' })}
                      tick={{ fontSize: 12 }}
                      className="text-gray-500"
                    />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => `$${val}`} className="text-gray-500" />
                    <Tooltip content={<CustomTooltip />} />
                    <defs>
                      <linearGradient id="instrRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" fill="url(#instrRevGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>

          {/* Enrollment Trend */}
          <motion.div variants={item}>
            <GlassCard className="p-5" hover={false}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-500" />
                Enrollments (Last 6 Months)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={enrollmentTrend.length > 0 ? enrollmentTrend : []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short' })}
                      tick={{ fontSize: 12 }}
                      className="text-gray-500"
                    />
                    <YAxis tick={{ fontSize: 12 }} className="text-gray-500" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="enrollments" name="Enrollments" radius={[6, 6, 0, 0]} fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top Performing Courses */}
            <motion.div variants={item}>
              <GlassCard className="p-6" hover={false}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Top Performing Courses</h2>
                  <Link to="/instructor/courses" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
                    View all <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="space-y-4">
                  {topCourses.length > 0 ? topCourses.map((course) => (
                    <div key={course.title} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{course.title}</h3>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {course.students}</span>
                            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> {course.rating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm">${course.revenue.toLocaleString()}</div>
                        <Badge variant="success" size="sm">Active</Badge>
                      </div>
                    </div>
                  )) : (
                    <div className="flex items-center gap-3 text-sm text-gray-400 py-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-500">No courses yet</p>
                        <p className="text-xs text-gray-400">Create your first course to get started!</p>
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>

            {/* Recent Activity */}
            <motion.div variants={item}>
              <GlassCard className="p-6" hover={false}>
                <h2 className="text-lg font-semibold mb-5">Recent Activity</h2>
                <div className="space-y-4">
                  {recentActivity.length > 0 ? recentActivity.map((activity, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        activity.type === 'enrollment' ? 'bg-green-500/10 text-green-500' :
                        activity.type === 'submission' ? 'bg-blue-500/10 text-blue-500' :
                        activity.type === 'review' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-purple-500/10 text-purple-500'
                      }`}>
                        {activity.type === 'enrollment' ? <Users className="w-4 h-4" /> :
                         activity.type === 'submission' ? <BookOpen className="w-4 h-4" /> :
                         activity.type === 'review' ? <Star className="w-4 h-4" /> :
                         <Activity className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{activity.action}</div>
                        <div className="text-gray-500">{activity.details}</div>
                      </div>
                      <div className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(activity.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  )) : (
                    <div className="flex items-center gap-3 text-sm text-gray-400 py-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-500">No activity yet</p>
                        <p className="text-xs text-gray-400">Activity will appear as students engage with your courses.</p>
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats with Real Data */}
            <motion.div variants={item}>
              <GlassCard className="p-6" hover={false}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Quick Stats
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      Pending reviews
                    </span>
                    <Badge variant={stats?.pendingReviews && stats.pendingReviews > 0 ? 'warning' : 'default'} size="sm">
                      {stats?.pendingReviews || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                      Unread messages
                    </span>
                    <Badge variant={stats?.unreadMessages && stats.unreadMessages > 0 ? 'primary' : 'default'} size="sm">
                      {stats?.unreadMessages || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      Upcoming live sessions
                    </span>
                    <Badge variant={stats?.upcomingLiveSessions && stats.upcomingLiveSessions > 0 ? 'primary' : 'default'} size="sm">
                      {stats?.upcomingLiveSessions || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <ListChecks className="w-3.5 h-3.5 text-red-400" />
                      Assignments to grade
                    </span>
                    <Badge variant={stats?.assignmentsToGrade && stats.assignmentsToGrade > 0 ? 'danger' : 'default'} size="sm">
                      {stats?.assignmentsToGrade || 0}
                    </Badge>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Performance Summary */}
            <motion.div variants={item}>
              <GlassCard className="p-6" hover={false}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary-500" />
                  Performance Summary
                </h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Average Rating</span>
                      <span className="font-medium flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-500" />
                        {stats?.averageRating || '0'}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-700"
                        style={{ width: `${Math.min(((parseFloat(stats?.averageRating || '0') || 0) / 5) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Course Load</span>
                      <span className="font-medium">{topCourses.length} / {stats?.activeCourses || 0} shown</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-700"
                        style={{ width: `${Math.min(((topCourses.length || 0) / Math.max(stats?.activeCourses || 1, 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="text-lg font-bold text-primary-500">{stats?.activeCourses || 0}</div>
                      <div className="text-xs text-gray-500">Courses</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="text-lg font-bold text-success-500">{stats?.totalStudents || 0}</div>
                      <div className="text-xs text-gray-500">Students</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="text-lg font-bold text-purple-500">{stats?.pendingReviews || 0}</div>
                      <div className="text-xs text-gray-500">To Review</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="text-lg font-bold text-amber-500">{stats?.unreadMessages || 0}</div>
                      <div className="text-xs text-gray-500">Unread</div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}