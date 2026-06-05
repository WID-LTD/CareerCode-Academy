import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
}

const blurMap = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
};

export function GlassCard({
  children,
  className,
  glow = false,
  blur = 'xl',
  hover = true,
}: GlassCardProps) {
  return (
    <motion.div
      whileHover={
        hover
          ? { y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }
          : undefined
      }
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-2xl border border-white/20 dark:border-gray-800/50 bg-white/70 dark:bg-gray-900/70 shadow-lg shadow-black/5',
        blurMap[blur],
        glow && 'shadow-[0_0_15px_rgba(99,102,241,0.3)] border-primary-500/30',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
