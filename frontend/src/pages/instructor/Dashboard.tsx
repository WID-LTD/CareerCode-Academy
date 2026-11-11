import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Users, DollarSign, TrendingUp, Star, Activity, RefreshCw,
  AlertCircle, GraduationCap, MessageSquare, Calendar, Clock, Zap,
  ChevronRight, BookMarked, UserPlus, BarChart3, ListChecks,
  CheckCircle, Edit, Award, ShoppingCart,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { TodoWidget } from '@/components/todos/TodoWidget';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useInstructorStore } from '@/store/instructorStore';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/hooks/useSocket';
import SEO from '@/components/seo/SEO';
import { StatsSkeleton, CardSkeleton, ChartSkeleton } from '@/components/student/SkeletonLoader';
import { formatCurrency } from '@/lib/utils';

const quickActions = [
  { label: 'New Course', path: '/instructor/courses/new', icon: BookMarked, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: 'View Students', path: '/instructor/students', icon: UserPlus, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { label: 'Schedule', path: '/instructor/schedule', icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { label: 'Messages', path: '/instructor/messages', icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 text-sm shadow-xl border border-gray-200/60 dark:border-gray-800/50">
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
    engagementData, isLoading, error, fetchDashboardStats,
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
    { icon: Users, label: 'Total Students', value: stats?.totalStudents?.toLocaleString() || '0', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { icon: Activity, label: 'Active Students', value: stats?.activeStudents?.toLocaleString() || '0', color: 'text-green-500', bg: 'bg-green-500/10' },
    { icon: BookOpen, label: 'Total Courses', value: stats?.totalCourses?.toString() || '0', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: CheckCircle, label: 'Published Courses', value: stats?.publishedCourses?.toString() || '0', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { icon: Edit, label: 'Draft Courses', value: stats?.draftCourses?.toString() || '0', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { icon: TrendingUp, label: 'Completion Rate', value: `${stats?.completionRate || 0}%`, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { icon: Star, label: 'Avg Rating', value: stats?.averageRating || '0', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { icon: Award, label: 'Certificates Issued', value: stats?.certificatesIssued?.toLocaleString() || '0', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { icon: Clock, label: 'Watch Time', value: stats?.totalWatchTime ? `${(stats.totalWatchTime / 3600).toFixed(1)}h` : '0h', color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { icon: DollarSign, label: 'Revenue', value: formatCurrency(stats?.monthlyRevenue || 0), color: 'text-green-500', bg: 'bg-green-500/10' },
    { icon: MessageSquare, label: 'Pending Reviews', value: stats?.pendingReviews?.toString() || '0', color: 'text-red-500', bg: 'bg-red-500/10' },
    { icon: Calendar, label: 'Upcoming Sessions', value: stats?.upcomingLiveSessions?.toString() || '0', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
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
      <SEO title="Instructor Dashboard" />
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
        <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 3xl:grid-cols-8 4xl:grid-cols-10 5xl:grid-cols-12 gap-3 sm:gap-4">
          {statCards.map((stat) => (
            <GlassCard key={stat.label} className="p-4 sm:p-5" hover={false}>
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

        <motion.div variants={item}>
          <TodoWidget basePath="/instructor" />
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={item}>
          <div className="grid grid-cols-2 sm:grid-cols-4 3xl:grid-cols-5 gap-2 sm:gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800 transition-all bg-white/50 dark:bg-gray-900/50"
              >
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${action.bg} flex items-center justify-center flex-shrink-0`}>
                  <action.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${action.color}`} />
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{action.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 3xl:grid-cols-3 4xl:grid-cols-4 gap-4 sm:gap-6">
          {/* Revenue Trend */}
          <motion.div variants={item}>
            <GlassCard className="p-5" hover={false}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                Revenue (Last 6 Months)
              </h3>
              <div className="chart-fluid">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenue.length > 0 ? monthlyRevenue : []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short' })}
                      tick={{ fontSize: 12 }}
                      className="text-gray-500"
                    />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => formatCurrency(Number(val))} className="text-gray-500" />
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
              <div className="chart-fluid">
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

          {/* Student Engagement */}
          <motion.div variants={item}>
            <GlassCard className="p-5" hover={false}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-500" />
                Student Engagement (Last 6 Months)
              </h3>
              <div className="chart-fluid">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={engagementData.length > 0 ? engagementData : []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short' })}
                      tick={{ fontSize: 12 }}
                      className="text-gray-500"
                    />
                    <YAxis tick={{ fontSize: 12 }} className="text-gray-500" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="active" name="Active" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="inactive" name="Inactive" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 3xl:grid-cols-4 5xl:grid-cols-5 gap-4 sm:gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 3xl:col-span-3 5xl:col-span-4 space-y-4 sm:space-y-6">
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
                        <div className="font-semibold text-sm">{formatCurrency(course.revenue)}</div>
                          {course.published
                            ? <Badge variant="success" size="sm">Published</Badge>
                            : <Badge variant="warning" size="sm">Draft</Badge>}
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
                      <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
                      Total students
                    </span>
                    <span className="font-semibold">{stats?.totalStudents || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-green-400" />
                      Active students
                    </span>
                    <span className="font-semibold">{stats?.activeStudents || 0}</span>
                  </div>
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
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-purple-400" />
                      Certificates issued
                    </span>
                    <span className="font-semibold">{stats?.certificatesIssued || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-orange-400" />
                      Total watch time
                    </span>
                    <span className="font-semibold">{stats?.totalWatchTime ? `${(stats.totalWatchTime / 3600).toFixed(1)}h` : '0h'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      Published courses
                    </span>
                    <span className="font-semibold">{stats?.publishedCourses || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Edit className="w-3.5 h-3.5 text-amber-400" />
                      Draft courses
                    </span>
                    <span className="font-semibold">{stats?.draftCourses || 0}</span>
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
                      <span className="text-gray-500">Completion Rate</span>
                      <span className="font-medium">{stats?.completionRate || 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
                        style={{ width: `${Math.min(stats?.completionRate || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Course Load</span>
                      <span className="font-medium">{topCourses.length} / {stats?.totalCourses || 0} shown</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-700"
                        style={{ width: `${Math.min(((topCourses.length || 0) / Math.max(stats?.totalCourses || 1, 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="text-lg font-bold text-primary-500">{stats?.totalCourses || 0}</div>
                      <div className="text-xs text-gray-500">Courses</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="text-lg font-bold text-success-500">{stats?.activeStudents || 0}</div>
                      <div className="text-xs text-gray-500">Active Students</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="text-lg font-bold text-purple-500">{stats?.totalStudents || 0}</div>
                      <div className="text-xs text-gray-500">Total Students</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="text-lg font-bold text-amber-500">{stats?.completionRate || 0}%</div>
                      <div className="text-xs text-gray-500">Completion</div>
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
