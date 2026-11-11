import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { BookOpen, Users, Award, GraduationCap } from 'lucide-react';
import { usePublicStats } from '@/hooks/usePublicStats';

function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1600;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return (
    <div ref={ref} className="font-display tabular-nums tracking-tight">
      {count.toLocaleString()}{suffix}
    </div>
  );
}

export function StatsCounter() {
  const live = usePublicStats();
  const stats = [
    { icon: Users, value: live.students, label: 'Students Enrolled' },
    { icon: BookOpen, value: live.courses, label: 'Courses Available' },
    { icon: Award, value: live.certificates, label: 'Certificates Issued' },
    { icon: GraduationCap, value: live.alumni, label: 'Graduate Alumni' },
  ].filter((s) => s.value > 0);

  if (!stats.length) return null;

  return (
    <section className="py-16 relative">
      <div className="absolute inset-0 gradient-bg opacity-5" />
      <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card p-8 sm:p-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-6 h-6 text-primary-500" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold gradient-text mb-1">
                  <Counter target={stat.value} suffix="+" />
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
