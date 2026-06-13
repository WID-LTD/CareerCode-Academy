import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { useStudentStore } from '@/store/studentStore';
import { ChartSkeleton } from './SkeletonLoader';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 text-sm shadow-xl border border-white/20 dark:border-gray-800/50">
        <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="text-xs font-medium">
            {entry.name}: {entry.value}{entry.name === 'Hours' ? 'h' : '%'}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function LearningAnalytics() {
  const { weeklyActivity, monthlyLearning, skillGrowth, isLoading } = useStudentStore();

  if (isLoading) {
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  const hasData = weeklyActivity.length > 0 || monthlyLearning.length > 0 || skillGrowth.length > 0;
  if (!hasData) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">Learning Analytics</h2>
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-5" hover={false}>
            <h3 className="text-sm font-medium mb-4 text-gray-600 dark:text-gray-400">Weekly Learning Activity</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyActivity} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} className="text-gray-500" />
                  <YAxis tick={{ fontSize: 12 }} className="text-gray-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="hours" name="Hours" radius={[6, 6, 0, 0]} fill="url(#barGradient)" />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* Monthly Learning */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="p-5" hover={false}>
            <h3 className="text-sm font-medium mb-4 text-gray-600 dark:text-gray-400">Monthly Learning Time</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyLearning} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-gray-500" />
                  <YAxis tick={{ fontSize: 12 }} className="text-gray-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="hours" name="Hours" stroke="#7C3AED" fill="url(#areaGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* Course Progress - Circular indicators */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard className="p-5" hover={false}>
            <h3 className="text-sm font-medium mb-4 text-gray-600 dark:text-gray-400">Course Progress</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Advanced React', progress: 72, color: '#6366f1' },
                { label: 'TypeScript', progress: 45, color: '#7C3AED' },
                { label: 'Python DS', progress: 90, color: '#06B6D4' },
              ].map((course) => (
                <div key={course.label} className="flex flex-col items-center gap-2">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-gray-700" />
                      <circle cx="32" cy="32" r="28" fill="none" stroke={course.color} strokeWidth="4" strokeDasharray={`${2 * Math.PI * 28}`} strokeDashoffset={`${2 * Math.PI * 28 * (1 - course.progress / 100)}`} strokeLinecap="round" className="transition-all duration-700" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: course.color }}>
                      {course.progress}%
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 text-center leading-tight">{course.label}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Skill Growth Radar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <GlassCard className="p-5" hover={false}>
            <h3 className="text-sm font-medium mb-4 text-gray-600 dark:text-gray-400">Skill Growth</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={skillGrowth} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <PolarGrid stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} className="text-gray-500" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} className="text-gray-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Radar name="Current" dataKey="current" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="Previous" dataKey="previous" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.1} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}
