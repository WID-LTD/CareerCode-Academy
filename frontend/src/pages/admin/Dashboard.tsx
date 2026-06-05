import React from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, DollarSign, TrendingUp, Activity, Award, ArrowUp, ArrowDown } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';

const stats = [
  { icon: Users, label: 'Total Users', value: '24,567', change: '+12.5%', trend: 'up', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: BookOpen, label: 'Total Courses', value: '256', change: '+8.3%', trend: 'up', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { icon: DollarSign, label: 'Revenue', value: '$128,430', change: '+23.1%', trend: 'up', color: 'text-green-500', bg: 'bg-green-500/10' },
  { icon: Award, label: 'Completion Rate', value: '87.5%', change: '+4.2%', trend: 'up', color: 'text-orange-500', bg: 'bg-orange-500/10' },
];

const revenueData = [
  { month: 'Jan', revenue: 85000, students: 1200 },
  { month: 'Feb', revenue: 92000, students: 1350 },
  { month: 'Mar', revenue: 88000, students: 1280 },
  { month: 'Apr', revenue: 105000, students: 1500 },
  { month: 'May', revenue: 115000, students: 1680 },
  { month: 'Jun', revenue: 128430, students: 1850 },
];

const userGrowth = [
  { month: 'Jan', users: 18000, active: 12000 },
  { month: 'Feb', users: 19500, active: 13500 },
  { month: 'Mar', users: 20500, active: 14200 },
  { month: 'Apr', users: 22000, active: 15500 },
  { month: 'May', users: 23500, active: 16800 },
  { month: 'Jun', users: 24567, active: 17800 },
];

export default function AdminDashboard() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-500">Platform-wide analytics and overview.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <GlassCard key={stat.label} className="p-5" hover={false}>
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium">
                {stat.trend === 'up' ? <ArrowUp className="w-3 h-3 text-green-500" /> : <ArrowDown className="w-3 h-3 text-red-500" />}
                <span className={stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}>{stat.change}</span>
              </div>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </GlassCard>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Revenue Overview</h2>
            <Badge variant="primary" size="sm">+23.1% vs last month</Badge>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revenueGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">User Growth</h2>
            <Badge variant="success" size="sm">+8.2% this month</Badge>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
              <Line type="monotone" dataKey="active" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-4">Top Courses</h2>
          <div className="space-y-4">
            {[
              { title: 'Full-Stack Web Development', enrollments: 2340, revenue: '$58,500' },
              { title: 'Data Science & ML', enrollments: 1870, revenue: '$46,750' },
              { title: 'Mobile App Development', enrollments: 1560, revenue: '$39,000' },
            ].map((c, i) => (
              <div key={c.title} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-5">{i + 1}.</span>
                  <span className="font-medium">{c.title}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{c.enrollments}</div>
                  <div className="text-xs text-gray-500">{c.revenue}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { action: 'New user registered', time: '2 min ago', type: 'user' },
              { action: 'Course published: React Native', time: '15 min ago', type: 'course' },
              { action: 'Payment received: $2,499', time: '1 hour ago', type: 'payment' },
              { action: 'New instructor application', time: '3 hours ago', type: 'instructor' },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  a.type === 'user' ? 'bg-blue-500' :
                  a.type === 'course' ? 'bg-purple-500' :
                  a.type === 'payment' ? 'bg-green-500' : 'bg-orange-500'
                }`} />
                <div className="flex-1">
                  <div className="text-gray-900 dark:text-gray-100">{a.action}</div>
                  <div className="text-xs text-gray-500">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-4">Platform Health</h2>
          <div className="space-y-4">
            {[
              { label: 'Server Uptime', value: '99.9%', color: 'text-green-500' },
              { label: 'Avg Response Time', value: '245ms', color: 'text-green-500' },
              { label: 'Active Sessions', value: '1,234', color: 'text-blue-500' },
              { label: 'Error Rate', value: '0.02%', color: 'text-green-500' },
              { label: 'API Requests/min', value: '8,567', color: 'text-purple-500' },
            ].map((h) => (
              <div key={h.label} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{h.label}</span>
                <span className={`font-medium ${h.color}`}>{h.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}
