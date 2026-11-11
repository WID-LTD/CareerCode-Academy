import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Award, CheckCircle, Flag, Target, Clock, Plus, Minus, Rocket, BarChart3, Zap, Gift, Copy, Coins } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/axios';
import { formatDate } from '@/lib/utils';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Milestone {
  date: string;
  title: string;
  description: string;
  icon: typeof Flag;
  color: string;
  type: 'start' | 'enrollment' | 'lesson' | 'certificate' | 'first-completed';
}

const STORAGE_KEY = 'roadmap_weekly_goal';
function getStoredGoal(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val) {
      const n = parseInt(val, 10);
      return n > 0 && n <= 168 ? n : 10;
    }
  } catch {}
  return 10;
}
function setStoredGoal(hours: number) {
  try { localStorage.setItem(STORAGE_KEY, String(Math.max(1, Math.min(168, hours)))); } catch {}
}
function getIconBg(type: string): string {
  switch (type) {
    case 'start': return 'bg-emerald-500/20 text-emerald-500';
    case 'enrollment': return 'bg-blue-500/20 text-blue-500';
    case 'lesson': return 'bg-purple-500/20 text-purple-500';
    case 'first-completed': return 'bg-amber-500/20 text-amber-500';
    case 'certificate': return 'bg-rose-500/20 text-rose-500';
    default: return 'bg-gray-500/20 text-gray-500';
  }
}
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const itemAnim = { hidden: { opacity: 0, x: -30 }, show: { opacity: 1, x: 0, transition: { duration: 0.4 } } };

const zoneMeta: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  beginner: { label: 'Beginner', icon: BookOpen, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-500/10' },
  intermediate: { label: 'Intermediate', icon: BarChart3, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-500/10' },
  advanced: { label: 'Advanced', icon: Rocket, color: 'from-purple-500 to-pink-600', bg: 'bg-purple-500/10' },
};

export default function StudentRoadmap() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [recentCourses, setRecentCourses] = useState<any[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(getStoredGoal);
  const [grouped, setGrouped] = useState<any[]>([]);
  const [xpBalance, setXpBalance] = useState<any>(null);
  const [discountCodes, setDiscountCodes] = useState<any[]>([]);
  const [redeemAmount, setRedeemAmount] = useState(1000);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => { setStoredGoal(weeklyGoal); }, [weeklyGoal]);

  const schoolCareers: Record<string, { careers: string[] }> = {
    'School of Software Development': { careers: ['Frontend Developer', 'Backend Developer', 'Full-Stack Engineer'] },
    'School of Data & Artificial Intelligence': { careers: ['Data Scientist', 'ML Engineer', 'Data Analyst'] },
    'School of Design & Creative Technology': { careers: ['UI/UX Designer', 'Product Designer', 'Visual Designer'] },
    'School of Business & Digital Careers': { careers: ['Product Manager', 'Business Analyst', 'Tech Consultant'] },
    'School of Career Readiness': { careers: ['Career Coach', 'Talent Specialist', 'HR Coordinator'] },
  };

  useEffect(() => {
    (async () => {
      try {
        const [dashRes, groupedRes, balanceRes, codesRes] = await Promise.all([
          api.get('/student/dashboard'),
          api.get('/learning-paths/grouped-by-school').catch(() => api.get('/learning-paths/grouped').catch(() => ({ data: { data: [] } }))),
          api.get('/gamification/balance').catch(() => ({ data: { data: null } })),
          api.get('/gamification/discount-codes').catch(() => ({ data: { data: [] } })),
        ]);
        const d = dashRes.data.data;
        setRecentActivity(d.recentActivity || []);
        setRecentCourses(d.recentCourses || []);
        setWeeklyActivity(d.analytics?.weeklyActivity || []);
        setStats(d.stats || {});
        setGrouped(groupedRes.data.data || []);
        if (balanceRes.data.data) setXpBalance(balanceRes.data.data);
        setDiscountCodes(codesRes.data.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load roadmap');
      } finally { setLoading(false); }
    })();
  }, []);

  const milestones = useMemo<Milestone[]>(() => {
    const items: Milestone[] = [];
    items.push({ date: new Date().toISOString(), title: 'Started Learning Journey', description: 'You embarked on your path to mastering new skills.', icon: Flag, color: 'emerald', type: 'start' });
    const enrollmentDates = recentCourses.filter((c: any) => c.enrolled_at).map((c: any) => ({ date: c.enrolled_at, title: c.title }));
    if (enrollmentDates.length > 0) {
      const earliest = enrollmentDates.reduce((a: any, b: any) => new Date(a.date) < new Date(b.date) ? a : b);
      items.push({ date: earliest.date, title: `Enrolled in "${earliest.title}"`, description: 'Started a new course to expand your knowledge.', icon: BookOpen, color: 'blue', type: 'enrollment' });
      enrollmentDates.forEach((e: any) => { if (e.date !== earliest.date) items.push({ date: e.date, title: `Enrolled in "${e.title}"`, description: 'Joined another course on your learning path.', icon: BookOpen, color: 'blue', type: 'enrollment' }); });
    }
    const completedCourses = recentCourses.filter((c: any) => c.progress === 100);
    if (completedCourses.length > 0) items.push({ date: completedCourses[0].enrolled_at || new Date().toISOString(), title: 'First Course Completed', description: `"${completedCourses[0].title}" — great milestone!`, icon: CheckCircle, color: 'amber', type: 'first-completed' });
    recentActivity.forEach((act: any) => {
      if (act.type === 'lesson') items.push({ date: act.created_at, title: `Completed lesson in "${act.course_title}"`, description: 'One step closer to mastering the material.', icon: CheckCircle, color: 'purple', type: 'lesson' });
      else if (act.type === 'certificate') items.push({ date: act.created_at, title: `Earned certificate for "${act.course_title}"`, description: 'Congratulations!', icon: Award, color: 'rose', type: 'certificate' });
    });
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return items;
  }, [recentActivity, recentCourses]);

  const weeklyHours = weeklyActivity.reduce((sum: number, d: any) => sum + (d.hours || 0), 0);
  const goalPercent = Math.min((weeklyHours / weeklyGoal) * 100, 100);

  const handleRedeem = async () => {
    if (!xpBalance) return;
    if (redeemAmount < (xpBalance.minRedeem || 1000)) { toast.error(`Minimum ${xpBalance.minRedeem} XP`); return; }
    if (redeemAmount % (xpBalance.step || 1000) !== 0) { toast.error(`Must be multiples of ${xpBalance.step}`); return; }
    setRedeeming(true);
    try {
      const { data } = await api.post('/gamification/redeem', { xpAmount: redeemAmount });
      toast.success(`Redeemed ${redeemAmount} XP for code ${data.data.code} (₦${data.data.discount_amount})`);
      const [b, c] = await Promise.all([api.get('/gamification/balance'), api.get('/gamification/discount-codes')]);
      setXpBalance(b.data.data);
      setDiscountCodes(c.data.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Redeem failed');
    } finally { setRedeeming(false); }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="h-4 w-72 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="flex gap-4"><div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800" /><div className="flex-1 space-y-2"><div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" /><div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" /></div></div>))}</div>
          <div><div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl" /></div>
        </div>
      </div>
    );
  }
  if (error) return (<div className="flex items-center justify-center min-h-[60vh]"><p className="text-danger-400 mb-4">{error}</p></div>);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><Flag className="w-6 h-6 text-primary-500" /> Career Roadmap</h1>
        <p className="text-gray-500 mt-1">Gamified journey by <span className="font-medium text-gray-700 dark:text-gray-300">Our Schools</span> — Beginner → Intermediate → Advanced (empty zones hidden).</p>
      </div>

      {/* XP Wallet + Redeem */}
      {xpBalance && (
        <GlassCard className="p-6" hover={false}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Coins className="w-5 h-5 text-amber-500" /> XP Wallet • 1000 XP = ₦100</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-amber-500/10 text-center">
              <div className="text-2xl font-bold text-amber-600">{xpBalance.available?.toLocaleString() || 0}</div>
              <div className="text-xs text-gray-500">Available XP</div>
              <div className="text-[11px] text-gray-400 mt-1">≈ ₦{xpBalance.ngnValue?.toLocaleString() || 0}</div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/10 text-center">
              <div className="text-lg font-bold text-emerald-600">{xpBalance.totalEarned?.toLocaleString() || 0}</div>
              <div className="text-xs text-gray-500">Total Earned</div>
            </div>
            <div className="p-4 rounded-xl bg-blue-500/10 text-center">
              <div className="text-lg font-bold text-blue-500">{discountCodes.filter((c:any)=>c.status==='active').length}</div>
              <div className="text-xs text-gray-500">Active Codes</div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="text-sm font-medium">Redeem XP</label>
              <div className="flex gap-2 mt-1">
                <Input type="number" value={String(redeemAmount)} onChange={(e)=>setRedeemAmount(parseInt(e.target.value)||0)} min={xpBalance.minRedeem} step={xpBalance.step} className="flex-1" />
                <Button onClick={handleRedeem} disabled={redeeming || !xpBalance.redeemEnabled} variant="primary">
                  {redeeming ? 'Redeeming...' : `Redeem`}
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Step {xpBalance.step} • Min {xpBalance.minRedeem} • Rate {xpBalance.rate} • ~₦{Math.floor(redeemAmount * (xpBalance.rate || 0.1))} discount • {xpBalance.redeemEnabled ? 'Enabled' : 'Disabled by admin'}</p>
            </div>
          </div>

          {discountCodes.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><Gift className="w-4 h-4 text-primary-500" /> Your Discount Codes</h3>
              <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {discountCodes.slice(0,8).map((c:any)=>(
                  <div key={c.id} className={`p-3 rounded-xl border text-sm flex items-center justify-between ${c.status==='active' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-gray-200 dark:border-gray-800 opacity-60'}`}>
                    <div>
                      <div className="font-mono font-bold">{c.code}</div>
                      <div className="text-xs text-gray-500">₦{c.discount_amount} • {c.xp_redeemed} XP • {c.status}</div>
                    </div>
                    <button onClick={()=>{navigator.clipboard.writeText(c.code); toast.success('Copied');}} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><Copy className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
              <Link to="/courses" className="text-xs text-primary-500 hover:underline mt-2 inline-block">Use at checkout →</Link>
            </div>
          )}
        </GlassCard>
      )}

      {/* Gamified School Roadmaps — Our Schools */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Rocket className="w-5 h-5 text-purple-500" /> School Roadmaps • Zones (Our Schools)</h2>
        {grouped.length === 0 ? (
          <GlassCard className="p-8 text-center" hover={false}><p className="text-gray-500">No roadmap data yet.</p><p className="text-xs text-gray-400 mt-1">Schools exist — publish courses with level & program to generate Beginner → Advanced zones.</p></GlassCard>
        ) : (
          <div className="space-y-6">
            {grouped.map((group:any)=>{
              const school = group.school || { name: group.category, slug: group.categorySlug, program_count: 0 };
              const sc = schoolCareers[school.name] || { careers: ['Developer'] };
              return (
              <GlassCard key={school.slug || group.category} className="p-0 overflow-hidden" hover={false}>
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold flex items-center gap-2">{school.name} <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{school.program_count || 0} programs • self-paced</span></h3>
                      <div className="flex flex-wrap gap-1 mt-1">{sc.careers.map((c:string)=><span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-500 border border-primary-500/20">{c}</span>)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1"><Link to={`/schools/${school.slug}`} className="text-xs text-primary-500 hover:underline">Explore Programs →</Link></div>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-2">{Object.values(group.zones).filter(Boolean).length} zones • empty hidden • Beginner → Intermediate → Advanced</div>
                </div>
                <div className="p-4">
                  <div className="relative">
                    {/* Wavy connector */}
                    <div className="hidden md:block absolute top-8 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 opacity-20 rounded-full" />
                    <div className="grid md:grid-cols-3 gap-4 relative">
                      {(['beginner','intermediate','advanced'] as const).map((level)=>{
                        const zone = group.zones[level];
                        if (!zone) return null;
                        const meta = zoneMeta[level];
                        const Icon = meta.icon;
                        return (
                          <div key={level} className="relative">
                            <div className={`rounded-2xl border-2 p-4 bg-white dark:bg-gray-900 ${meta.bg.replace('/10','/5')} border-gray-200 dark:border-gray-800`}>
                              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${meta.color} rounded-t-2xl`} />
                              <div className="flex items-center gap-2 mb-2 mt-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.bg}`}><Icon className="w-4 h-4" /></div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r ${meta.color} text-white`}>{meta.label}</span>
                                <span className="text-xs text-gray-500 ml-auto">{zone.courses_count} courses</span>
                              </div>
                              <div className="space-y-1 text-xs text-gray-500">
                                <div className="flex justify-between"><span>Courses</span><span className="font-medium text-gray-700 dark:text-gray-300">{zone.courses_count}</span></div>
                                <div className="flex justify-between"><span>Duration</span><span>{Math.floor((zone.total_duration||0)/60)}h</span></div>
                                <div className="flex justify-between"><span>Students</span><span>{zone.students_count}</span></div>
                              </div>
                              <Link to={`/student/learning-paths/${zone.path.slug}`} className="mt-3 block text-center text-xs font-medium text-primary-600 hover:underline">View Path →</Link>
                            </div>
                            <div className={`hidden md:flex absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gradient-to-r ${meta.color} border-2 border-white dark:border-gray-900 items-center justify-center`}><Zap className="w-2 h-2 text-white" /></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </GlassCard>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlassCard className="p-6" hover={false}>
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2"><Flag className="w-4 h-4 text-primary-500" /> Milestones</h2>
            {milestones.length === 0 ? (
              <div className="text-center py-10"><Flag className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">No milestones yet</p><p className="text-sm text-gray-400">Enroll in a course to start building your roadmap.</p></div>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="relative">
                <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="space-y-0">
                  {milestones.map((ms, i) => {
                    const Icon = ms.icon;
                    const isLast = i === milestones.length - 1;
                    return (
                      <motion.div key={`${ms.type}-${i}`} variants={itemAnim} className="relative flex items-start gap-5 pb-8 last:pb-0">
                        <div className="relative z-10 flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getIconBg(ms.type)} ring-4 ring-white dark:ring-gray-900`}><Icon className="w-4 h-4" /></div>
                          {isLast && <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />}
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5">
                          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{ms.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{ms.description}</p>
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 mt-1"><Clock className="w-3 h-3" />{formatDate(ms.date)}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-6" hover={false}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-primary-500" /> Weekly Goal</h2>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">Target hours</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setWeeklyGoal((g) => Math.max(1, g - 1))} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><Minus className="w-3.5 h-3.5 text-gray-500" /></button>
                <span className="text-2xl font-bold tabular-nums text-primary-500 min-w-[3ch] text-center">{weeklyGoal}</span>
                <button onClick={() => setWeeklyGoal((g) => Math.min(168, g + 1))} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><Plus className="w-3.5 h-3.5 text-gray-500" /></button>
              </div>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Progress</span><span className="font-medium">{weeklyHours.toFixed(1)}h / {weeklyGoal}h</span></div>
              <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${goalPercent}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500" /></div>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{weeklyHours >= weeklyGoal ? 'Great job — you hit your weekly target!' : `${(weeklyGoal - weeklyHours).toFixed(1)}h more to reach your goal`}</p>
          </GlassCard>

          <GlassCard className="p-6" hover={false}>
            <h2 className="text-lg font-semibold mb-4">Learning Summary</h2>
            {stats && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10 text-center"><div className="text-lg font-bold text-blue-500">{stats.enrolledCourses || 0}</div><div className="text-xs text-gray-500">Enrolled</div></div>
                <div className="p-3 rounded-xl bg-amber-500/10 text-center"><div className="text-lg font-bold text-amber-500">{stats.completedCourses || 0}</div><div className="text-xs text-gray-500">Completed</div></div>
                <div className="p-3 rounded-xl bg-purple-500/10 text-center"><div className="text-lg font-bold text-purple-500">{stats.completedLessons || 0}</div><div className="text-xs text-gray-500">Lessons</div></div>
                <div className="p-3 rounded-xl bg-rose-500/10 text-center"><div className="text-lg font-bold text-rose-500">{stats.certificates || 0}</div><div className="text-xs text-gray-500">Certificates</div></div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}
