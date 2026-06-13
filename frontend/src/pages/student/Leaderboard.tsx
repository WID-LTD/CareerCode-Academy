import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, Medal, TrendingUp, TrendingDown, Minus, Crown,
  Zap, Award,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useStudentStore } from '@/store/studentStore';
import { PageSkeleton } from '@/components/student/SkeletonLoader';

const rankColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600', 'text-gray-600', 'text-gray-600'];

export default function Leaderboard() {
  const { leaderboard, isLoading, fetchLeaderboard } = useStudentStore();

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  if (isLoading && leaderboard.length === 0) return <PageSkeleton />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Leaderboard</h1>
        <p className="text-gray-500 mt-1">See how you rank among your peers.</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-3">
          <GlassCard className="p-0 overflow-hidden" hover={false}>
            {/* Header */}
            <div className="gradient-bg px-5 py-4 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-300" />
              <h2 className="font-semibold text-white">Top Learners This Week</h2>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {leaderboard.map((entry, i) => (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    'flex items-center gap-4 px-5 py-4 transition-colors',
                    entry.isCurrentUser
                      ? 'bg-primary-500/5 border-l-2 border-primary-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  )}
                >
                  {/* Rank */}
                  <div className="w-8 text-center">
                    {entry.rank <= 3 ? (
                      <Crown className={cn('w-5 h-5 mx-auto', rankColors[entry.rank - 1])} />
                    ) : (
                      <span className="text-sm font-bold text-gray-400">#{entry.rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0',
                    entry.rank === 1 ? 'bg-yellow-500' :
                    entry.rank === 2 ? 'bg-gray-400' :
                    entry.rank === 3 ? 'bg-amber-600' :
                    'bg-primary-500'
                  )}>
                    {entry.name.charAt(0)}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{entry.name}</span>
                      {entry.isCurrentUser && (
                        <Badge variant="primary" size="sm">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-0.5"><Zap className="w-3 h-3" /> {entry.xpPoints.toLocaleString()} XP</span>
                      <span className="flex items-center gap-0.5"><Award className="w-3 h-3" /> {entry.badges} badges</span>
                    </div>
                  </div>

                  {/* Rank Change */}
                  <div className={cn(
                    'flex items-center gap-1 text-xs font-medium',
                    entry.rankChange > 0 ? 'text-success-500' :
                    entry.rankChange < 0 ? 'text-danger-500' :
                    'text-gray-400'
                  )}>
                    {entry.rankChange > 0 ? <TrendingUp className="w-3 h-3" /> :
                     entry.rankChange < 0 ? <TrendingDown className="w-3 h-3" /> :
                     <Minus className="w-3 h-3" />}
                    {entry.rankChange !== 0 && Math.abs(entry.rankChange)}
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Podium / Sidebar */}
        <div className="space-y-6">
          <GlassCard className="p-5" hover={false}>
            <h3 className="text-sm font-semibold mb-4">Your Stats</h3>
            {(() => {
              const me = leaderboard.find(e => e.isCurrentUser);
              if (!me) return null;
              return (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-2">
                      {me.name.charAt(0)}
                    </div>
                    <h4 className="font-semibold">{me.name}</h4>
                    <Badge variant="primary">Rank #{me.rank}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="text-lg font-bold text-primary-500">{me.xpPoints.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">XP Points</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="text-lg font-bold text-amber-500">{me.badges}</div>
                      <div className="text-xs text-gray-500">Badges</div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}
