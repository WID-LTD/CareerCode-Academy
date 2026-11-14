import { motion } from 'framer-motion';
import { Target, CheckCircle2 } from 'lucide-react';

interface DailyGoalProgressProps {
  xpEarned: number;
  goal: number;
}

export function DailyGoalProgress({ xpEarned, goal }: DailyGoalProgressProps) {
  const pct = Math.min((xpEarned / goal) * 100, 100);
  const reached = xpEarned >= goal;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
      {reached ? (
        <CheckCircle2 className="w-5 h-5 text-success-400 flex-shrink-0" />
      ) : (
        <Target className="w-5 h-5 text-primary-400 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-white/70 font-medium">
            {reached ? 'Goal reached!' : `Daily Goal`}
          </span>
          <span className="text-xs font-bold text-white">
            {xpEarned}/{goal} experience points
          </span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              reached
                ? 'bg-gradient-to-r from-success-500 to-success-400'
                : 'bg-gradient-to-r from-primary-500 to-accent-500'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
