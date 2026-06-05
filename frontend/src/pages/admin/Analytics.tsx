import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign, BookOpen, ArrowUp, ArrowDown } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Cell, Legend,
} from 'recharts';

const monthlyRevenue = [
  { month: 'Jan', revenue: 65000, cost: 45000, profit: 20000 },
  { month: 'Feb', revenue: 72000, cost: 48000, profit: 24000 },
  { month: 'Mar', revenue: 68000, cost: 46000, profit: 22000 },
  { month: 'Apr', revenue: 85000, cost: 52000, profit: 33000 },
  { month: 'May', revenue: 95000, cost: 55000, profit: 40000 },
  { month: 'Jun', revenue: 108430, cost: 58000, profit: 50430 },
];

const enrollmentsByCategory = [
  { name: 'Web Development', value: 35 },
  { name: 'Data Science', value: 25 },
  { name: 'Mobile Dev', value: 18 },
  { name: 'DevOps', value: 12 },
  { name: 'Design', value: 10 },
];

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

const userRetention = [
  { month: 'Jan', retention: 82, engagement: 65 },
  { month: 'Feb', retention: 84, engagement: 68 },
  { month: 'Mar', retention: 83, engagement: 67 },
  { month: 'Apr', retention: 86, engagement: 72 },
  { month: 'May', retention: 88, engagement: 75 },
  { month: 'Jun', retention: 90, engagement: 78 },
];

const statsCards = [
  { label: 'Total Revenue', value: '$493,860', change: '+18.5%', trend: 'up', icon: DollarSign },
  { label: 'Active Users', value: '17,843', change: '+12.3%', trend: 'up', icon: Users },
  { label: 'Avg. Session', value: '24m 32s', change: '+5.2%', trend: 'up', icon: TrendingUp },
  { label: 'Course Completion', value: '87.5%', change: '+4.1%', trend: 'up', icon: BookOpen },
];

export default function Analytics() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Analytics</h1>
        <p className="text-gray-500">Deep insights into platform performance and user behavior.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((stat) => (
          <GlassCard key={stat.label} className="p-5" hover={false}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary-500" />
              </div>
              <Badge variant="success" size="sm">{stat.change}</Badge>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </GlassCard>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Revenue vs Costs</h2>
            <Badge variant="primary" size="sm">Monthly</Badge>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Enrollments by Category</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={enrollmentsByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                {enrollmentsByCategory.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">User Retention & Engagement</h2>
          <Badge variant="success" size="sm">Improving</Badge>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={userRetention}>
            <defs>
              <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} unit="%" />
            <Tooltip />
            <Area type="monotone" dataKey="retention" stroke="#6366f1" fill="url(#retentionGradient)" strokeWidth={2} name="Retention" />
            <Area type="monotone" dataKey="engagement" stroke="#22c55e" fill="url(#engagementGradient)" strokeWidth={2} name="Engagement" />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>
    </motion.div>
  );
}
