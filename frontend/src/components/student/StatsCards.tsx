import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, CheckCircle, Award, Clock, Flame, Zap, TrendingUp, TrendingDown,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: any;
  label: string;
  value: number;
  color: string;
  bg: string;
  trend?: number;
  suffix?: string;
  delay?: number;
}

function CountUp({ value, suffix = '', duration = 2000 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {count}{suffix}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color, bg, trend, suffix = '', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <GlassCard className="p-4 group cursor-default" hover>
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110', bg)}>
            <Icon className={cn('w-5 h-5', color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn('text-xl font-bold', color)}>
                <CountUp value={value} suffix={suffix} />
              </span>
              {trend !== undefined && trend !== 0 && (
                <span className={cn('flex items-center text-xs font-medium', trend > 0 ? 'text-success-500' : 'text-danger-500')}>
                  {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 truncate">{label}</div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

interface StatsCardsProps {
  stats: {
    enrolledCourses: number;
    completedCourses: number;
    certificates: number;
    completedLessons: number;
    totalLearningHours: number;
    currentStreak: number;
    xpPoints: number;
  } | null;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards: StatCardProps[] = [
    { icon: BookOpen, label: 'Courses Enrolled', value: stats?.enrolledCourses || 0, color: 'text-blue-500', bg: 'bg-blue-500/10', trend: 12, delay: 0.05 },
    { icon: CheckCircle, label: 'Courses Completed', value: stats?.completedCourses || 0, color: 'text-success-500', bg: 'bg-success-500/10', trend: 8, delay: 0.1 },
    { icon: Award, label: 'Certificates Earned', value: stats?.certificates || 0, color: 'text-amber-500', bg: 'bg-amber-500/10', trend: 0, delay: 0.15 },
    { icon: Clock, label: 'Learning Hours', value: stats?.totalLearningHours || 0, color: 'text-purple-500', bg: 'bg-purple-500/10', suffix: 'h', trend: 15, delay: 0.2 },
    { icon: Flame, label: 'Current Streak', value: stats?.currentStreak || 0, color: 'text-orange-500', bg: 'bg-orange-500/10', suffix: 'd', trend: 5, delay: 0.25 },
    { icon: Zap, label: 'XP Points', value: stats?.xpPoints || 0, color: 'text-yellow-500', bg: 'bg-yellow-500/10', trend: 22, delay: 0.3 },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
