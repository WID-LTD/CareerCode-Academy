import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInstructorStore } from '@/store/instructorStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { DollarSign, Users, BookOpen } from 'lucide-react';
import { StatsSkeleton, ChartSkeleton } from '@/components/student/SkeletonLoader';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function InstructorAnalytics() {
  const { analytics, fetchAnalytics, isLoading } = useInstructorStore();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <StatsSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  const statCards = [
    { icon: BookOpen, label: 'Total Courses', value: analytics.totalCourses.toString(), color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: Users, label: 'Total Students', value: analytics.totalStudents.toString(), color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { icon: DollarSign, label: 'Total Revenue', value: `$${analytics.totalRevenue.toLocaleString()}`, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Course Analytics</h1>
        <p className="text-gray-500">Real-time revenue and enrollment data.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => (
          <GlassCard key={stat.label} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stat.value}</div>
            <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-6 mb-8">
        <h2 className="text-lg font-bold mb-6">Revenue Overview (Last 6 Months)</h2>
        <div className="h-80 w-full">
          {analytics.monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.monthlyRevenue} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short' })}
                  axisLine={false}
                  tickLine={false}
                  className="text-xs"
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${val}`}
                  className="text-xs"
                />
                <Tooltip 
                  formatter={(value: number) => [`$${value}`, 'Revenue']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              No revenue data available for the selected period.
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
