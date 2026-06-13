import { motion } from 'framer-motion';
import { Flame, Zap, TrendingUp, Play, Award, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useStudentStore } from '@/store/studentStore';
import { Link } from 'react-router-dom';

const motivationalQuotes = [
  'The expert in anything was once a beginner.',
  'Success is the sum of small efforts repeated day in and day out.',
  'Learning never exhausts the mind.',
  'The beautiful thing about learning is that no one can take it away from you.',
  'Education is the most powerful weapon to change the world.',
];

export function HeroSection() {
  const { user } = useAuthStore();
  const { stats, recentCourses } = useStudentStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const quote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
  const activeCourse = recentCourses.find(c => c.progress > 0 && c.progress < 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-secondary-600 to-accent-600 p-6 sm:p-8"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                {greeting}, {user?.name?.split(' ')[0] || 'Learner'} 👋
              </h1>
            </div>
            <p className="text-white/80 text-sm sm:text-base max-w-lg">
              Welcome back to CareerCode Academy. {activeCourse ? 'Pick up where you left off.' : 'Start your next learning adventure!'}
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-4">
              {activeCourse && (
                <Link to={`/student/courses/${activeCourse.slug}`}>
                  <Button className="bg-white text-primary-700 hover:bg-white/90 shadow-lg shadow-black/20">
                    <Play className="w-4 h-4" /> Resume Learning
                  </Button>
                </Link>
              )}
              <Link to="/courses">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Browse Courses <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-4 mt-4 text-white/80 text-sm">
              {stats && (
                <>
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                    <Zap className="w-4 h-4 text-yellow-300" />
                    <span><strong className="text-white">{stats.xpPoints || 0}</strong> XP</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                    <TrendingUp className="w-4 h-4 text-emerald-300" />
                    <span>Level <strong className="text-white">{stats.level || 1}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                    <Award className="w-4 h-4 text-amber-300" />
                    <span>Rank #<strong className="text-white">{stats.rank || '-'}</strong></span>
                  </div>
                  {stats.currentStreak > 0 && (
                    <div className="flex items-center gap-1.5 bg-orange-500/20 px-3 py-1.5 rounded-full border border-orange-500/30">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <span><strong className="text-white">{stats.currentStreak}</strong> day streak</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-lg">
              {user?.name?.charAt(0) || 'L'}
            </div>
            <span className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Learner</span>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
          <p className="text-white/70 text-xs sm:text-sm italic">
            &ldquo;{quote}&rdquo;
          </p>
        </div>
      </div>
    </motion.div>
  );
}
