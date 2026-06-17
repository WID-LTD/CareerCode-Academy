import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Brain, Flame, Award, GraduationCap, HeartHandshake, Lock, X, Info, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useStudentStore } from '@/store/studentStore';

const iconMap: Record<string, any> = {
  Zap, Brain, Flame, Award, GraduationCap, HeartHandshake,
};

function XpBreakdown({ xp }: { xp: number }) {
  const lessonsXp = Math.round(xp * 0.4);
  const coursesXp = Math.round(xp * 0.35);
  const certsXp = Math.round(xp * 0.25);
  return (
    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-2 text-xs">
      <p className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
        <TrendingUp className="w-3 h-3" /> XP Breakdown
      </p>
      <div className="space-y-1">
        {[
          { label: 'Lessons', value: lessonsXp, color: 'bg-blue-500' },
          { label: 'Courses', value: coursesXp, color: 'bg-emerald-500' },
          { label: 'Certificates', value: certsXp, color: 'bg-amber-500' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-gray-500 w-16">{item.label}</span>
              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${xp ? (item.value / xp) * 100 : 0}%` }} />
              </div>
            </div>
            <span className="font-medium text-gray-600 dark:text-gray-400 w-10 text-right">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AchievementCenter() {
  const { badges, stats } = useStudentStore();
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [showXpBreakdown, setShowXpBreakdown] = useState(false);

  if (badges.length === 0) return null;

  const earnedCount = badges.filter(b => b.earned).length;
  const totalXp = stats?.xpPoints || 0;
  const currentLevel = stats?.level || 1;
  const xpPerLevel = 500;
  const xpForCurrentLevel = (currentLevel - 1) * xpPerLevel;
  const xpProgress = totalXp - xpForCurrentLevel;
  const xpToNextLevel = xpPerLevel;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">Achievements</h2>
      <GlassCard className="p-5" hover={false}>
        {/* XP Progression Bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Level {currentLevel}</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs">{totalXp} / {currentLevel * xpPerLevel} XP</span>
              <button
                onClick={() => setShowXpBreakdown(!showXpBreakdown)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="XP breakdown"
              >
                <Info className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((xpProgress / xpToNextLevel) * 100, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500"
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-gray-400">{earnedCount} badges earned</span>
            <span className="text-[10px] text-gray-400">{xpToNextLevel - xpProgress} XP to next level</span>
          </div>
        </div>

        {showXpBreakdown && <XpBreakdown xp={totalXp} />}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {badges.map((badge, i) => {
            const Icon = iconMap[badge.icon] || Award;
            return (
              <motion.button
                key={badge.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedBadge(badge)}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl text-center transition-all hover:scale-105 ${
                  badge.earned
                    ? 'bg-gradient-to-b from-primary-500/10 to-accent-500/5 border border-primary-500/20'
                    : 'bg-gray-100/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/50'
                }`}
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
              </motion.button>
            );
          })}
        </div>
      </GlassCard>

      {/* Badge Detail Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold">{selectedBadge.name}</h3>
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-col items-center gap-3 py-4">
                {(() => {
                  const BIcon = iconMap[selectedBadge.icon] || Award;
                  return (
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      selectedBadge.earned ? 'bg-primary-500/20' : 'bg-gray-200 dark:bg-gray-700'
                    }`}>
                      <BIcon className={`w-8 h-8 ${selectedBadge.earned ? 'text-primary-500' : 'text-gray-400'}`} />
                    </div>
                  );
                })()}
                <p className="text-sm text-gray-500 text-center">{selectedBadge.description}</p>
                {selectedBadge.earned && selectedBadge.earned_at && (
                  <p className="text-xs text-gray-400">
                    Earned on {new Date(selectedBadge.earned_at).toLocaleDateString()}
                  </p>
                )}
                {!selectedBadge.earned && selectedBadge.progress !== undefined && (
                  <div className="w-full space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Progress</span>
                      <span>{selectedBadge.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${selectedBadge.progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
              <Button className="w-full" variant="outline" onClick={() => setSelectedBadge(null)}>
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
