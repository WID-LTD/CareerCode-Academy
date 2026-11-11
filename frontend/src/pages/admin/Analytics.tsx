import React, { useEffect, useCallback, useRef } from 'react';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Users, Eye, MousePointer, TrendingUp, Globe, Smartphone,
  Monitor, Activity, Download, RefreshCw, Clock, UserPlus,
  BookOpen, DollarSign, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];
const RANGE_OPTIONS = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function truncateUrl(url: string, max = 35): string {
  if (url.length <= max) return url;
  return url.substring(0, max) + '...';
}

export default function AdminAnalytics() {
  const store = useAnalyticsStore();
  const { range, overview, visitorTrend, pageAnalytics, deviceAnalytics, sourceAnalytics, conversionFunnel, journeyAnalytics, courseAnalytics, clickAnalytics, realtime, loading } = store;
  const autoRef = useRef<ReturnType<typeof setInterval>>();
  const realtimeRef = useRef<ReturnType<typeof setInterval>>();

  const loadData = useCallback((r?: string) => {
    store.fetchAll(r);
  }, []);

  useEffect(() => {
    loadData();
    autoRef.current = setInterval(() => loadData(), 60000);
    realtimeRef.current = setInterval(() => store.fetchRealtime(), 10000);
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
      if (realtimeRef.current) clearInterval(realtimeRef.current);
    };
  }, []);

  const handleExport = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Visitors', overview?.totalVisitors || 0],
      ['Unique Visitors', overview?.uniqueVisitors || 0],
      ['Returning Rate', `${overview?.returningRate || 0}%`],
      ['Bounce Rate', `${overview?.bounceRate || 0}%`],
      ['Avg Session Duration', formatDuration(overview?.avgSessionDuration || 0)],
      ['Total Page Views', overview?.totalPageViews || 0],
      ['Active Visitors', overview?.activeVisitors || 0],
    ];
    if (conversionFunnel) {
      headers.push('Funnel', '');
      rows.push(['Visitors to Signup', `${conversionFunnel.funnel.visitorToSignup}%`]);
      rows.push(['Signup to Enrollment', `${conversionFunnel.funnel.signupToEnrollment}%`]);
      rows.push(['Overall Conversion', `${conversionFunnel.funnel.overallConversion}%`]);
    }
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportFull = () => {
    const lines: string[] = [];
    const section = (title: string, headers: string[], rows: any[][]) => {
      lines.push(title);
      lines.push(headers.join(','));
      rows.forEach((r) => lines.push(r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')));
      lines.push('');
    };
    section('Overview', ['Metric', 'Value'], [
      ['Total Visitors', overview?.totalVisitors || 0],
      ['Unique Visitors', overview?.uniqueVisitors || 0],
      ['Returning Rate', `${overview?.returningRate || 0}%`],
      ['Bounce Rate', `${overview?.bounceRate || 0}%`],
      ['Avg Session Duration', formatDuration(overview?.avgSessionDuration || 0)],
      ['Total Page Views', overview?.totalPageViews || 0],
    ]);
    section('Pages', ['Path', 'Views', 'Unique Visitors', 'Avg Duration'], (pageAnalytics?.mostVisited || []).map((p: any) => [p.page_url, p.views, p.unique_visitors, formatDuration(p.avg_time_sec || 0)]));
    section('Devices', ['Device', 'Sessions', 'Percentage'], (deviceAnalytics?.devices || []).map((d: any) => [d.device_type, d.count, `${d.percentage}%`]));
    section('Sources', ['Source', 'Sessions', 'Percentage'], (sourceAnalytics || []).map((s: any) => [s.source, s.sessions, `${s.percentage}%`]));
    section('Courses', ['Course', 'Views', 'Enrollments', 'Revenue'], (courseAnalytics || []).map((c: any) => [c.title, c.page_views, c.enrollments, c.revenue]));
    const clickRows = Array.isArray(clickAnalytics) ? clickAnalytics : (clickAnalytics?.elements || clickAnalytics?.clicks || clickAnalytics?.topElements || []);
    section('Clicks', ['Element', 'Clicks'], clickRows.map((c: any) => [c.element || c.label || c.selector, c.clicks || c.count || 0]));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-full-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => store.setRange(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                range === opt.value ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'text-gray-400 hover:text-white border border-transparent'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={() => loadData()} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" /> Overview
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportFull}>
            <Download className="w-4 h-4 mr-1" /> Export all
          </Button>
        </div>
      </div>

      {/* ===== REALTIME WIDGET ===== */}
      {realtime && (
        <GlassCard className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500" />
                </span>
                <span className="text-xs text-gray-400">Live Now</span>
              </div>
              <div className="text-2xl font-bold text-white">{realtime.activeVisitors}</div>
              <div className="text-xs text-gray-500">active visitors</div>
            </div>
            <div className="text-center">
              <UserPlus className="w-5 h-5 text-primary-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{realtime.todayRegistrations}</div>
              <div className="text-xs text-gray-500">signups today</div>
            </div>
            <div className="text-center">
              <BookOpen className="w-5 h-5 text-accent-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{realtime.todayEnrollments}</div>
              <div className="text-xs text-gray-500">enrollments today</div>
            </div>
            <div className="text-center">
              <Eye className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{overview?.totalPageViews || 0}</div>
              <div className="text-xs text-gray-500">total page views</div>
            </div>
          </div>
          {realtime.currentPages.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <p className="text-xs text-gray-500 mb-2">Currently viewing:</p>
              <div className="flex flex-wrap gap-2">
                {realtime.currentPages.slice(0, 5).map((p, i) => (
                  <span key={i} className="text-xs bg-gray-800 px-2 py-1 rounded-full text-gray-300">
                    {truncateUrl(p.page_url, 25)} <span className="text-primary-400 font-medium">({p.viewers})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* ===== VISITOR STATS CARDS ===== */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Visitors', value: overview.totalVisitors, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Unique Visitors', value: overview.uniqueVisitors, icon: Eye, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { label: 'Returning Rate', value: `${overview.returningRate}%`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Bounce Rate', value: `${overview.bounceRate}%`, icon: Activity, color: overview.bounceRate > 50 ? 'text-red-400' : 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Avg Session', value: formatDuration(overview.avgSessionDuration), icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
            { label: 'Page Views', value: formatNumber(overview.totalPageViews), icon: Globe, color: 'text-pink-400', bg: 'bg-pink-500/10' },
          ].map((stat) => (
            <GlassCard key={stat.label}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{stat.label}</p>
                  <p className="text-lg font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0 ml-2`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* ===== VISITOR TREND CHART ===== */}
      {visitorTrend.length > 0 && (
        <GlassCard>
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-500" />
            Visitor Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={visitorTrend}>
              <defs>
                <linearGradient id="visitorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pageviewGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="label" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#1e1e3f', border: '1px solid #ffffff20', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Area type="monotone" dataKey="visitors" stroke="#3b82f6" fill="url(#visitorGrad)" strokeWidth={2} name="Visitors" />
              <Area type="monotone" dataKey="page_views" stroke="#8b5cf6" fill="url(#pageviewGrad)" strokeWidth={2} name="Page Views" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {/* ===== PAGE VIEW RANKINGS + DEVICE BREAKDOWN ===== */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Most Visited Pages */}
        {pageAnalytics && pageAnalytics.mostVisited.length > 0 && (
          <GlassCard>
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-500" />
              Most Visited Pages
            </h2>
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {pageAnalytics.mostVisited.slice(0, 10).map((page, i) => {
                const maxViews = Math.max(...pageAnalytics.mostVisited.map(p => p.views));
                const pct = maxViews > 0 ? (page.views / maxViews) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-6 shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs text-white truncate">{truncateUrl(page.page_url, 40)}</p>
                        <span className="text-xs text-gray-400 ml-2 shrink-0">{page.views}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-800 rounded-full">
                        <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* Device & Browser Breakdown */}
        {deviceAnalytics && deviceAnalytics.devices.length > 0 && (
          <GlassCard>
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-500" />
              Devices & Browsers
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Device</p>
                <div className="space-y-2">
                  {deviceAnalytics.devices.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {d.device_type === 'mobile' ? <Smartphone className="w-3 h-3 text-blue-400" /> :
                       d.device_type === 'tablet' ? <Monitor className="w-3 h-3 text-purple-400" /> :
                       <Monitor className="w-3 h-3 text-gray-400" />}
                      <span className="text-xs text-gray-300 flex-1 capitalize">{d.device_type || 'unknown'}</span>
                      <span className="text-xs text-gray-500">{d.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Browser</p>
                <div className="space-y-2">
                  {deviceAnalytics.browsers.slice(0, 5).map((b, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-gray-300">{b.browser}</span>
                      <span className="text-xs text-gray-500">{b.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">OS</p>
                <div className="space-y-2">
                  {deviceAnalytics.os.slice(0, 5).map((o, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-gray-300">{o.os}</span>
                      <span className="text-xs text-gray-500">{o.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        )}
      </div>

      {/* ===== TRAFFIC SOURCES + CONVERSION FUNNEL ===== */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        {sourceAnalytics.length > 0 && (
          <GlassCard>
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-500" />
              Traffic Sources
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-1/2 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceAnalytics}
                      dataKey="visitors"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                    >
                      {sourceAnalytics.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1e1e3f', border: '1px solid #ffffff20', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {sourceAnalytics.map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-gray-300 flex-1 capitalize">{s.source}</span>
                    <span className="text-xs text-gray-500">{s.percentage}%</span>
                    {s.returningRate > 0 && (
                      <Badge className="text-[10px] bg-gray-800 text-gray-400">{s.returningRate}% return</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        )}

        {/* Conversion Funnel */}
        {conversionFunnel && (
          <GlassCard>
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              Conversion Funnel
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Visitors', value: conversionFunnel.funnel.visitors, pct: 100, color: 'bg-blue-500' },
                { label: 'Signups', value: conversionFunnel.funnel.signups, pct: conversionFunnel.funnel.visitorToSignup, color: 'bg-purple-500' },
                { label: 'Enrollments', value: conversionFunnel.funnel.enrollments, pct: conversionFunnel.funnel.signupToEnrollment, color: 'bg-emerald-500' },
              ].map((step, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{step.label}</span>
                    <span className="text-white font-medium">{formatNumber(step.value)}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-3 relative overflow-hidden">
                    <div
                      className={`${step.color} h-full rounded-full transition-all duration-700`}
                      style={{ width: `${step.pct}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white mix-blend-overlay">
                      {step.pct}%
                    </span>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Overall Conversion</span>
                  <span className={`font-bold text-lg ${conversionFunnel.funnel.overallConversion > 2 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {conversionFunnel.funnel.overallConversion}%
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        )}
      </div>

      {/* ===== SOURCE PERFORMANCE TABLE ===== */}
      {conversionFunnel && conversionFunnel.sourcePerformance.length > 0 && (
        <GlassCard>
          <h2 className="text-white font-semibold mb-4">Source Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-500">
                  <th className="text-left py-2 px-2">Source</th>
                  <th className="text-right py-2 px-2">Visitors</th>
                  <th className="text-right py-2 px-2">Signups</th>
                  <th className="text-right py-2 px-2">Enrollments</th>
                  <th className="text-right py-2 px-2">Conv. Rate</th>
                </tr>
              </thead>
              <tbody>
                {conversionFunnel.sourcePerformance.map((s: any, i: number) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 px-2 text-white capitalize">{s.source}</td>
                    <td className="py-2 px-2 text-right text-gray-400">{s.visitors}</td>
                    <td className="py-2 px-2 text-right text-gray-400">{s.signups}</td>
                    <td className="py-2 px-2 text-right text-gray-400">{s.enrollments}</td>
                    <td className="py-2 px-2 text-right">
                      <Badge className={`${s.visitors > 0 && (s.enrollments / s.visitors) > 0.05 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
                        {s.visitors > 0 ? `${((s.enrollments / s.visitors) * 100).toFixed(1)}%` : '0%'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* ===== COURSE ANALYTICS TABLE ===== */}
      {courseAnalytics.length > 0 && (
        <GlassCard>
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary-500" />
            Course Performance
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-500">
                  <th className="text-left py-2 px-2">Course</th>
                  <th className="text-right py-2 px-2">Views</th>
                  <th className="text-right py-2 px-2">Enrollments</th>
                  <th className="text-right py-2 px-2">Completion</th>
                  <th className="text-right py-2 px-2">Rating</th>
                  <th className="text-right py-2 px-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {courseAnalytics.map((course: any, i: number) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 px-2 text-white max-w-[200px] truncate">{course.title}</td>
                    <td className="py-2 px-2 text-right text-gray-400">{course.page_views}</td>
                    <td className="py-2 px-2 text-right">
                      <Badge className="bg-blue-500/20 text-blue-400">{course.enrollments}</Badge>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${course.completion_rate}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{course.completion_rate}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className={course.avg_rating >= 4 ? 'text-emerald-400' : course.avg_rating >= 3 ? 'text-amber-400' : 'text-red-400'}>
                        {course.avg_rating || '-'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-emerald-400 font-medium">
                      ${Number(course.revenue).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* ===== USER JOURNEY + CLICK ANALYTICS ===== */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Drop-off Points */}
        {journeyAnalytics && journeyAnalytics.dropOffs && journeyAnalytics.dropOffs.length > 0 && (
          <GlassCard>
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-500" />
              Drop-off Points
            </h2>
            <div className="space-y-2">
              {journeyAnalytics.dropOffs.map((d: any, i: number) => {
                const maxDrop = Math.max(...journeyAnalytics.dropOffs.map((x: any) => x.drop_offs));
                const pct = maxDrop > 0 ? (d.drop_offs / maxDrop) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-6 shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs text-white truncate">{truncateUrl(d.dropped_at_page, 40)}</p>
                        <span className="text-xs text-red-400 ml-2 shrink-0">{d.drop_offs}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-800 rounded-full">
                        <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* Top Clicked Elements */}
        {clickAnalytics && clickAnalytics.topCtas && clickAnalytics.topCtas.length > 0 && (
          <GlassCard>
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <MousePointer className="w-4 h-4 text-primary-500" />
              Top CTAs
            </h2>
            <div className="space-y-2">
              {clickAnalytics.topCtas.map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/30">
                  <span className="text-xs text-gray-500 w-6 shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{c.element_text}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary-400 shrink-0">{c.clicks}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>

      {/* ===== LANDING VS EXIT PAGES ===== */}
      {pageAnalytics && (pageAnalytics.landingPages.length > 0 || pageAnalytics.exitPages.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {pageAnalytics.landingPages.length > 0 && (
            <GlassCard>
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                Top Landing Pages
              </h2>
              <div className="space-y-1">
                {pageAnalytics.landingPages.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-xs text-gray-300 truncate flex-1">{truncateUrl(p.page_url, 45)}</span>
                    <Badge className="bg-emerald-500/20 text-emerald-400 ml-2">{p.entries}</Badge>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
          {pageAnalytics.exitPages.length > 0 && (
            <GlassCard>
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4 text-red-500" />
                Top Exit Pages
              </h2>
              <div className="space-y-1">
                {pageAnalytics.exitPages.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-xs text-gray-300 truncate flex-1">{truncateUrl(p.page_url, 45)}</span>
                    <Badge className="bg-red-500/20 text-red-400 ml-2">{p.exits}</Badge>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* ===== INSIGHTS SECTION ===== */}
      {overview && conversionFunnel && (
        <GlassCard className="p-5" hover={false}>
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-500" />
            Key Insights
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-gray-800/30">
              <p className="text-xs text-gray-500 mb-1">Most Visitors Come From</p>
              <p className="text-white font-semibold capitalize">{sourceAnalytics[0]?.source || 'Direct'}</p>
              <p className="text-xs text-gray-500">{sourceAnalytics[0]?.percentage || 0}% of traffic</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-800/30">
              <p className="text-xs text-gray-500 mb-1">Primary Device</p>
              <p className="text-white font-semibold capitalize">{deviceAnalytics?.devices[0]?.device_type || 'Desktop'}</p>
              <p className="text-xs text-gray-500">{deviceAnalytics?.devices[0]?.percentage || 0}% of visitors</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-800/30">
              <p className="text-xs text-gray-500 mb-1">Conversion Rate</p>
              <p className={`font-semibold text-lg ${conversionFunnel.funnel.overallConversion > 2 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {conversionFunnel.funnel.overallConversion}%
              </p>
              <p className="text-xs text-gray-500">Visitor → Enrollment</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-800/30">
              <p className="text-xs text-gray-500 mb-1">Avg Session</p>
              <p className="text-white font-semibold">{formatDuration(overview.avgSessionDuration)}</p>
              <p className="text-xs text-gray-500">Bounce: {overview.bounceRate}%</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ===== EMPTY STATE ===== */}
      {!loading && overview && overview.totalVisitors === 0 && (
        <GlassCard>
          <div className="text-center py-12">
            <Globe className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-1">No Analytics Data Yet</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Analytics data will appear here once visitors start browsing your platform.
              Tracking is automatic — no configuration needed.
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
