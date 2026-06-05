import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  color?: 'blue' | 'purple' | 'pink' | 'green';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colorMap = {
  blue: {
    base: 'text-neon-blue border-neon-blue/50',
    glow: 'shadow-[0_0_5px_rgba(0,245,255,0.5),0_0_10px_rgba(0,245,255,0.3)] hover:shadow-[0_0_10px_rgba(0,245,255,0.8),0_0_20px_rgba(0,245,255,0.5)]',
    bg: 'hover:bg-neon-blue/10',
  },
  purple: {
    base: 'text-neon-purple border-neon-purple/50',
    glow: 'shadow-[0_0_5px_rgba(176,38,255,0.5),0_0_10px_rgba(176,38,255,0.3)] hover:shadow-[0_0_10px_rgba(176,38,255,0.8),0_0_20px_rgba(176,38,255,0.5)]',
    bg: 'hover:bg-neon-purple/10',
  },
  pink: {
    base: 'text-neon-pink border-neon-pink/50',
    glow: 'shadow-[0_0_5px_rgba(255,0,170,0.5),0_0_10px_rgba(255,0,170,0.3)] hover:shadow-[0_0_10px_rgba(255,0,170,0.8),0_0_20px_rgba(255,0,170,0.5)]',
    bg: 'hover:bg-neon-pink/10',
  },
  green: {
    base: 'text-neon-green border-neon-green/50',
    glow: 'shadow-[0_0_5px_rgba(0,255,135,0.5),0_0_10px_rgba(0,255,135,0.3)] hover:shadow-[0_0_10px_rgba(0,255,135,0.8),0_0_20px_rgba(0,255,135,0.5)]',
    bg: 'hover:bg-neon-green/10',
  },
};

const sizes = {
  sm: 'px-4 py-1.5 text-sm',
  md: 'px-6 py-2.5 text-sm',
  lg: 'px-8 py-3.5 text-base',
};

export function NeonButton({
  children,
  color = 'blue',
  size = 'md',
  className,
  ...props
}: NeonButtonProps) {
  const c = colorMap[color];
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 font-semibold rounded-xl border-2 transition-all duration-300 cursor-pointer',
        c.base,
        c.glow,
        c.bg,
        sizes[size],
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
