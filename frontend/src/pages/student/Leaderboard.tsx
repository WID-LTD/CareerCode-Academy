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

      {/* Podium */}
      {leaderboard.length >= 3 && (
        <div className="flex items-end justify-center gap-4 mb-8">
          {/* 2nd Place */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-lg font-bold text-white shadow-lg">
              {leaderboard[1].name.charAt(0)}
            </div>
            <span className="text-xs font-medium text-gray-500 truncate max-w-[80px] text-center">{leaderboard[1].name}</span>
            <div className="w-16 h-20 bg-gray-200 dark:bg-gray-800 rounded-t-xl flex items-center justify-center">
              <Medal className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-500 font-medium">2nd</span>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-full bg-yellow-500 flex items-center justify-center text-xl font-bold text-white shadow-lg ring-4 ring-yellow-500/30">
              {leaderboard[0].name.charAt(0)}
            </div>
            <span className="text-sm font-semibold truncate max-w-[90px] text-center">{leaderboard[0].name}</span>
            <div className="w-20 h-28 bg-gradient-to-t from-yellow-500/20 to-transparent rounded-t-xl flex items-center justify-center border border-yellow-500/30">
              <Crown className="w-6 h-6 text-yellow-500" />
            </div>
            <span className="text-xs font-semibold text-yellow-500">1st</span>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-full bg-amber-600 flex items-center justify-center text-lg font-bold text-white shadow-lg">
              {leaderboard[2].name.charAt(0)}
            </div>
            <span className="text-xs font-medium text-gray-500 truncate max-w-[80px] text-center">{leaderboard[2].name}</span>
            <div className="w-16 h-16 bg-amber-600/10 dark:bg-amber-900/20 rounded-t-xl flex items-center justify-center border border-amber-600/20">
              <Medal className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-[10px] text-gray-500 font-medium">3rd</span>
          </motion.div>
        </div>
      )}

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
