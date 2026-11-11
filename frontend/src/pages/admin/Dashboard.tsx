import { useEffect, useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Users, GraduationCap, BookOpen, DollarSign, Award, TrendingUp,
  UserPlus, FileText, Activity, Zap, Wifi, ArrowUpRight, ArrowDownRight,
  Bell, MessageSquare, Download, AlertCircle, Eye, Globe, Clock, UserCheck, RefreshCw,
  PieChart, BarChart3, Target, Sparkles,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, ComposedChart, Legend,
  PieChart as RePieChart, Pie, Cell,
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Select } from '@/components/ui/Select';
import { StatsSkeleton, ChartSkeleton } from '@/components/student/SkeletonLoader';
import { useAdminStore } from '@/store/adminStore';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { useSocket } from '@/hooks/useSocket';
import { useAnalyticsSocket } from '@/hooks/useAnalyticsSocket';
import SEO from '@/components/seo/SEO';
import { formatCurrency } from '@/lib/utils';

function formatRelativeTime(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-64 flex items-center justify-center">
      <div className="text-center">
        <BarChart3 className="w-8 h-8 text-gray-300 dark:text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-400">{message}</p>
      </div>
    </div>
  );
}

const statCards = [
  { key: 'totalStudents', label: 'Total Students', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', link: '/admin/users', trendKey: 'totalStudents' },
  { key: 'totalInstructors', label: 'Instructors', icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-500/10', link: '/admin/users', trendKey: 'totalInstructors' },
  { key: 'pendingApplications', label: 'Pending Apps', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10', link: '/admin/applications' },
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

export default function AdminDashboard() {
  const {
    stats, recentUsers, recentPayments, monthlyRevenue, refundTrend,
    enrollmentTrend, userRegistrationTrend, topCourses, recentActivities,
    payoutSummary, completionTrend, lastFetchedAt,
    isLoading, error, fetchDashboardData,
  } = useAdminStore();
  const { socket, onlineCount, onlineUsers } = useSocket();
  useAnalyticsSocket();
  const {
    overview: analyticsOverview, realtime, conversionFunnel, sourceAnalytics,
    loading: analyticsLoading, fetchOverview, fetchRealtime, fetchConversionFunnel, fetchSourceAnalytics,
  } = useAnalyticsStore();
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [showSparklines, setShowSparklines] = useState(true);
  const timeRangeRef = useRef('6m');
  const autoRef = useRef<ReturnType<typeof setInterval>>();
  const onlineRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback((range?: string) => {
    fetchDashboardData(range || timeRangeRef.current);
  }, [fetchDashboardData]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchOverview('24h');
    fetchRealtime();
    fetchConversionFunnel('24h');
    fetchSourceAnalytics('24h');
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchRealtime();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (onlineRef.current && !onlineRef.current.contains(e.target as Node)) {
        setShowOnlineUsers(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = () => loadData();
    socket.on('dashboard:update', handler);
    return () => { socket.off('dashboard:update', handler); };
  }, [socket, loadData]);

  useEffect(() => {
    autoRef.current = setInterval(() => loadData(), 60000);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [loadData]);

  const handleRangeChange = (range: string) => {
    timeRangeRef.current = range;
    loadData(range);
  };

  const formatValue = (key: string, value: any) => {
    if (key === 'monthlyRevenue' || key === 'totalRevenue') {
      return formatCurrency(Number(value) || 0);
    }
    return (value || 0).toLocaleString();
  };

  const mergedRevenue = monthlyRevenue.map((m: any) => {
    const refund = refundTrend.find((r: any) => r.date === m.date);
    return { ...m, refunds: refund?.refunds || 0 };
  });

  const funnel = conversionFunnel?.funnel;
  const funnelBars = funnel ? [
    { name: 'Visitors', value: funnel.visitors, fill: '#6366f1' },
    { name: 'Signups', value: funnel.signups, fill: '#8B5CF6' },
    { name: 'Enrollments', value: funnel.enrollments, fill: '#10B981' },
  ] : [];

  const sourceColors = ['#6366f1', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
  const acquisitionData = sourceAnalytics
    .slice(0, 5)
    .map((s: any, i: number) => ({
      name: s.source || 'Direct',
      value: Math.round(Number(s.percentage) || 0),
      color: sourceColors[i % sourceColors.length],
    }));

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
      <SEO title="Admin Dashboard" />
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
            <Badge variant="primary" size="sm" className="px-2 py-0.5">
              <Sparkles className="w-3 h-3" /> Enterprise
            </Badge>
          </div>
          <p className="text-gray-400 mt-1">Platform overview and key metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-500/10 text-success-600 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500" />
            </span>
            Live
          </div>
          <Select
            value={timeRangeRef.current}
            onChange={(e) => handleRangeChange(e.target.value)}
            options={[
              { value: '7d', label: '7 days' },
              { value: '30d', label: '30 days' },
              { value: '6m', label: '6 months' },
              { value: '1y', label: '1 year' },
            ]}
            className="w-auto min-w-[110px]"
          />
          <Button variant="ghost" size="sm" onClick={() => loadData()}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {lastFetchedAt && (
            <span className="text-xs text-gray-400 whitespace-nowrap">
              Updated {formatRelativeTime(lastFetchedAt)}
            </span>
          )}
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
        <div className="space-y-6">
          <StatsSkeleton />
          <div className="grid lg:grid-cols-2 gap-6">
            <ChartSkeleton className="h-72" />
            <ChartSkeleton className="h-72" />
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <ChartSkeleton className="h-52" />
            <ChartSkeleton className="h-52" />
            <ChartSkeleton className="h-52" />
          </div>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 3xl:grid-cols-8 5xl:grid-cols-10 gap-3 sm:gap-4">
            <motion.div variants={item} ref={onlineRef} className="relative">
              <GlassCard className="p-4 group cursor-pointer" hover onClick={() => setShowOnlineUsers(v => !v)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success-500/10 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Wifi className="w-5 h-5 text-success-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold flex items-center gap-2 tabular-nums">
                      {onlineCount}
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500" />
                      </span>
                    </div>
                    <div className="text-xs text-gray-300 truncate">Online Now</div>
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
              {showOnlineUsers && onlineUsers.length > 0 && (
                <div className="absolute z-50 top-full left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 max-h-64 overflow-y-auto">
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Online Users ({onlineCount})</p>
                  <div className="space-y-2">
                    {onlineUsers.map((u: any) => (
                      <div key={u.id} className="flex items-center gap-2 text-sm">
                        <div className="w-7 h-7 rounded-full bg-primary-500/10 flex items-center justify-center text-[10px] font-bold text-primary-600 flex-shrink-0">
                          {(u.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{u.name || 'Anonymous'}</p>
                          <p className="text-xs text-gray-400 capitalize">{u.role || 'user'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                          <div className="text-lg font-bold flex items-center gap-2 tabular-nums">
                            {formatValue(stat.key, value)}
                            {trend !== undefined && trend !== 0 && (
                              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${trend > 0 ? 'text-success-500' : 'text-danger-500'}`}>
                                {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(trend)}%
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 truncate">{stat.label}</div>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              );
            })}

            <motion.div variants={item}>
              <Link to="/admin/payouts" className="block">
                <GlassCard className="p-4 group cursor-pointer" hover>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center transition-transform group-hover:scale-110">
                      <DollarSign className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-bold flex items-center gap-2 tabular-nums">
                        {payoutSummary ? `${payoutSummary.pendingCount} · ${formatCurrency(payoutSummary.pendingAmount)}` : '0'}
                      </div>
                      <div className="text-xs text-gray-400 truncate">Pending Payouts</div>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          </div>

          {/* Quick Actions + Conversion Funnel */}
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
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

            {/* Conversion Funnel */}
            <motion.div variants={item}>
              <GlassCard className="p-5" hover={false}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary-500" />
                  Conversion Funnel
                </h3>
                <div className="chart-fluid-sm">
                  {funnelBars.length === 0 || funnelBars.every((b) => b.value === 0) ? (
                    <EmptyState message="No funnel data in the selected range" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnelBars} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} className="text-gray-500" />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} className="text-gray-500" width={90} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" name="Users" radius={[0, 6, 6, 0]} barSize={20}>
                          {funnelBars.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                {funnel && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-primary-500/10 text-center">
                      <div className="text-sm font-bold text-primary-500 tabular-nums">{funnel.visitorToSignup}%</div>
                      <div className="text-[10px] text-gray-400">Visitor → Signup</div>
                    </div>
                    <div className="p-2 rounded-lg bg-purple-500/10 text-center">
                      <div className="text-sm font-bold text-purple-500 tabular-nums">{funnel.signupToEnrollment}%</div>
                      <div className="text-[10px] text-gray-400">Signup → Enroll</div>
                    </div>
                    <div className="p-2 rounded-lg bg-success-500/10 text-center">
                      <div className="text-sm font-bold text-success-500 tabular-nums">{funnel.overallConversion}%</div>
                      <div className="text-[10px] text-gray-400">Overall</div>
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* User Acquisition */}
            <motion.div variants={item}>
              <GlassCard className="p-5" hover={false}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-purple-500" />
                  Acquisition Sources
                </h3>
                {acquisitionData.length === 0 || acquisitionData.every((item) => item.value === 0) ? (
                  <div className="chart-fluid-sm">
                    <EmptyState message="No acquisition data in the selected range" />
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="h-40 w-40 flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie data={acquisitionData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                            {acquisitionData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2">
                      {acquisitionData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-gray-500 flex-1">{item.name}</span>
                          <span className="font-medium tabular-nums">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>

          {/* Today at a Glance */}
          <motion.div variants={item}>
            <GlassCard className="p-5" hover={false}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary-500" />
                Today at a Glance
                {analyticsLoading && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                  <Globe className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                  <div className="text-lg font-bold text-blue-500 tabular-nums">{realtime?.activeVisitors ?? analyticsOverview?.activeVisitors ?? '-'}</div>
                  <div className="text-xs text-gray-400">Active Now</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                  <Users className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                  <div className="text-lg font-bold text-indigo-500 tabular-nums">{analyticsOverview?.uniqueVisitors ?? '-'}</div>
                  <div className="text-xs text-gray-400">Visitors Today</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                  <Eye className="w-4 h-4 text-cyan-500 mx-auto mb-1" />
                  <div className="text-lg font-bold text-cyan-500 tabular-nums">{analyticsOverview?.totalPageViews ?? '-'}</div>
                  <div className="text-xs text-gray-400">Page Views</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                  <UserCheck className="w-4 h-4 text-success-500 mx-auto mb-1" />
                  <div className="text-lg font-bold text-success-500 tabular-nums">{conversionFunnel?.funnel?.signups ?? realtime?.todayRegistrations ?? '-'}</div>
                  <div className="text-xs text-gray-400">Signups</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                  <UserPlus className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                  <div className="text-lg font-bold text-purple-500 tabular-nums">{conversionFunnel?.funnel?.enrollments ?? realtime?.todayEnrollments ?? '-'}</div>
                  <div className="text-xs text-gray-400">Enrollments</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                  <Clock className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                  <div className="text-lg font-bold text-amber-500 tabular-nums">
                    {analyticsOverview?.avgSessionDuration ? `${Math.round(analyticsOverview.avgSessionDuration / 60)}m` : '-'}
                  </div>
                  <div className="text-xs text-gray-400">Avg Session</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 4xl:grid-cols-3 gap-4 sm:gap-6">
            {/* Enrollment Trend */}
            <motion.div variants={item}>
              <GlassCard className="p-5" hover={false}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary-500" />
                  Enrollment Trend
                </h3>
                <div className="chart-fluid">
                  {enrollmentTrend.length === 0 ? (
                    <EmptyState message="No enrollment data for the selected range" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={enrollmentTrend}>
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
                  )}
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
                <div className="chart-fluid">
                  {mergedRevenue.length === 0 ? (
                    <EmptyState message="No revenue data for the selected range" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={mergedRevenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-gray-500" />
                        <YAxis tick={{ fontSize: 12 }} className="text-gray-500" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} fill="#10B981" />
                        <Line type="monotone" dataKey="refunds" name="Refunds" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Completion Trend + New Registrations + Top Courses */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 4xl:grid-cols-4 gap-4 sm:gap-6">
            {/* Completion Trend */}
            <motion.div variants={item}>
              <GlassCard className="p-5" hover={false}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary-500" />
                  Course Completions
                </h3>
                <div className="chart-fluid-sm">
                  {completionTrend.length === 0 ? (
                    <EmptyState message="No completion data yet" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={completionTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-gray-500" />
                        <YAxis tick={{ fontSize: 11 }} className="text-gray-500" />
                        <Tooltip content={<CustomTooltip />} />
                        <defs>
                          <linearGradient id="completionGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="completions" name="Completions" stroke="#8B5CF6" fill="url(#completionGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </GlassCard>
            </motion.div>

            {/* User Registration Trend */}
            <motion.div variants={item}>
              <GlassCard className="p-5" hover={false}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-purple-500" />
                  New Registrations
                </h3>
                <div className="chart-fluid-sm">
                  {userRegistrationTrend.length === 0 ? (
                    <EmptyState message="No registration data for the selected range" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={userRegistrationTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-gray-500" />
                        <YAxis tick={{ fontSize: 11 }} className="text-gray-500" />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="users" name="Users" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
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
                {topCourses.length === 0 ? (
                  <EmptyState message="No course data yet" />
                ) : (
                  <div className="space-y-3">
                    {topCourses.slice(0, 6).map((course: any, i: number) => {
                      const max = Math.max(...topCourses.map((c: any) => c.enrollments));
                      const pct = Math.max(4, ((course.enrollments || 0) / max) * 100);
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className={`text-xs font-bold w-5 tabular-nums ${i < 3 ? 'text-primary-500' : 'text-gray-400'}`}>#{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate">{course.title}</p>
                              <span className="text-xs text-gray-400 ml-2 tabular-nums">{course.enrollments}</span>
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
                )}
              </GlassCard>
            </motion.div>
          </div>

          {/* Platform Insights */}
          <motion.div variants={item}>
            <GlassCard className="p-5" hover={false}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary-500" />
                Platform Insights
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 3xl:grid-cols-6 gap-3 sm:gap-4">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                  <div className="text-lg font-bold text-primary-500 tabular-nums">
                    {stats ? Math.round((stats.publishedCourses / Math.max(stats.totalCourses, 1)) * 100) : 0}%
                  </div>
                  <div className="text-xs text-gray-400">Published Rate</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                  <div className="text-lg font-bold text-success-500 tabular-nums">
                    {stats ? Math.round((stats.totalEnrollments / Math.max(stats.totalStudents, 1)) * 100) : 0}%
                  </div>
                  <div className="text-xs text-gray-400">Enrollment Rate</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                  <div className="text-lg font-bold text-purple-500 tabular-nums">
                    {stats ? Math.round((stats.certificatesIssued / Math.max(stats.totalEnrollments, 1)) * 100) : 0}%
                  </div>
                  <div className="text-xs text-gray-400">Completion Rate</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                  <div className="text-lg font-bold text-amber-500 tabular-nums">{stats?.totalInstructors || 0}</div>
                  <div className="text-xs text-gray-400">Instructors</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Recent Activity Feed */}
          <motion.div variants={item}>
            <GlassCard className="p-5" hover={false}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" />
                Recent Activity
              </h3>
              <div className="grid sm:grid-cols-2 4xl:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">New Users</p>
                  <div className="space-y-2">
                      {recentUsers.length === 0 ? (
                      <p className="text-sm text-gray-300 text-center py-3">No activity</p>
                    ) : (
                      recentUsers.slice(0, 5).map((user: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center text-xs font-bold text-primary-500 flex-shrink-0">
                            {user.name?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <p className="text-xs text-gray-400 capitalize">{user.role} joined</p>
                          </div>
                          <span className="text-xs text-gray-400">{new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Audit Trail</p>
                  <div className="space-y-2">
                      {recentActivities.length === 0 ? (
                      <p className="text-sm text-gray-300 text-center py-3">No recent activity</p>
                    ) : (
                      recentActivities.slice(0, 5).map((act: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-bold text-amber-500 flex-shrink-0">
                            {(act.admin_name || 'S')?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{act.admin_name || 'System'}</p>
                            <p className="text-xs text-gray-400 truncate">{act.action} - {act.resource_type || ''}</p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {act.created_at ? new Date(act.created_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                      ))
                    )}
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
