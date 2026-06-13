import { motion } from 'framer-motion';
import { Zap, Brain, Flame, Award, GraduationCap, HeartHandshake, Lock } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useStudentStore } from '@/store/studentStore';

const iconMap: Record<string, any> = {
  Zap, Brain, Flame, Award, GraduationCap, HeartHandshake,
};

export function AchievementCenter() {
  const { badges, stats } = useStudentStore();
  if (badges.length === 0) return null;

  const earnedCount = badges.filter(b => b.earned).length;
  const totalXp = stats?.xpPoints || 0;
  const xpToNextLevel = 5000;
  const currentLevel = stats?.level || 1;
  const xpProgress = totalXp % xpToNextLevel;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">Achievements</h2>
      <GlassCard className="p-5" hover={false}>
        {/* XP Progression Bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Level {currentLevel}</span>
            <span className="text-gray-500 text-xs">{totalXp} / {currentLevel * xpToNextLevel} XP</span>
          </div>
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(xpProgress / xpToNextLevel) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500"
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-gray-400">{earnedCount} badges earned</span>
            <span className="text-[10px] text-gray-400">{xpToNextLevel - xpProgress} XP to next level</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {badges.map((badge, i) => {
            const Icon = iconMap[badge.icon] || Award;
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl text-center transition-all ${
                  badge.earned
                    ? 'bg-gradient-to-b from-primary-500/10 to-accent-500/5 border border-primary-500/20'
                    : 'bg-gray-100/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/50'
                }`}
                title={badge.description}
              >
                {!badge.earned && (
                  <div className="absolute inset-0 rounded-xl bg-gray-200/50 dark:bg-gray-800/50 flex items-center justify-center z-10">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  badge.earned ? 'bg-primary-500/20' : 'bg-gray-300 dark:bg-gray-700'
                }`}>
                  <Icon className={`w-5 h-5 ${badge.earned ? 'text-primary-500' : 'text-gray-400'}`} />
                </div>
                <span className={`text-[11px] font-medium leading-tight ${badge.earned ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                  {badge.name}
                </span>
                {!badge.earned && badge.progress !== undefined && (
                  <div className="w-full h-1 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-gray-400 dark:bg-gray-500 rounded-full" style={{ width: `${badge.progress}%` }} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </GlassCard>
    </section>
  );
}
