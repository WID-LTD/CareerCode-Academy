import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { GitBranch, BookOpen, Clock, Award, Users, CheckCircle, PlayCircle, Rocket, BarChart3, Zap, Target, Briefcase, ArrowRight, LayoutDashboard, Server, Layers, Smartphone, Boxes, ShieldCheck, FlaskConical, BrainCircuit, Brain, Palette, PenTool } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const goalIcons: Record<string, any> = {
  LayoutDashboard, Server, Layers, Smartphone, Boxes, ShieldCheck,
  BarChart3, FlaskConical, BrainCircuit, Brain, Palette, PenTool,
};

const zoneMeta: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  beginner: { label: 'Beginner', icon: BookOpen, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  intermediate: { label: 'Intermediate', icon: BarChart3, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  advanced: { label: 'Advanced', icon: Rocket, color: 'from-purple-500 to-pink-600', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
};

const schoolCareers: Record<string, { careers: string[]; description: string }> = {
  'School of Software Development': { careers: ['Frontend Developer', 'Backend Developer', 'Full-Stack Engineer'], description: 'Focused on preparing students for careers in software engineering and application development.' },
  'School of Data & Artificial Intelligence': { careers: ['Data Scientist', 'ML Engineer', 'Data Analyst'], description: 'Focused on data-driven careers and emerging technologies.' },
  'School of Design & Creative Technology': { careers: ['UI/UX Designer', 'Product Designer', 'Visual Designer'], description: 'Focused on creating digital experiences and visual communication.' },
  'School of Business & Digital Careers': { careers: ['Product Manager', 'Business Analyst', 'Tech Consultant'], description: 'Focused on modern business and digital economy skills.' },
  'School of Career Readiness': { careers: ['Career Coach', 'Talent Specialist', 'HR Coordinator'], description: 'Focused on preparing students for employment and professional success.' },
};

export default function LearningPaths() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [grouped, setGrouped] = useState<any[]>([]);
  const [enrolledPaths, setEnrolledPaths] = useState<any[]>([]);
  const [careerGoals, setCareerGoals] = useState<any[]>([]);
  const [myGoals, setMyGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [xpBalance, setXpBalance] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [groupedRes, enrolledRes, balanceRes, goalsRes, myGoalsRes] = await Promise.all([
          api.get('/learning-paths/grouped-by-school').catch(() => api.get('/learning-paths/grouped').catch(() => ({ data: { data: [] } }))),
          isAuthenticated ? api.get('/learning-paths/my/enrollments').catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
          isAuthenticated ? api.get('/gamification/balance').catch(() => null) : Promise.resolve(null),
          api.get('/career-goals').catch(() => ({ data: { data: [] } })),
          isAuthenticated ? api.get('/career-goals/my/goals').catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
        ]);
        setGrouped(groupedRes.data.data || []);
        setEnrolledPaths(enrolledRes.data.data || []);
        setCareerGoals(goalsRes.data.data || []);
        setMyGoals(myGoalsRes.data.data || []);
        if (balanceRes?.data?.data) setXpBalance(balanceRes.data.data);
      } catch {
        setGrouped([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [isAuthenticated]);

  const handleEnroll = async (slug: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.post(`/learning-paths/${slug}/enroll`);
      const { paidCourses = [], enrolledCourseIds = [] } = res.data.data || {};
      if (enrolledCourseIds.length > 0) {
        toast.success(`Enrolled! ${enrolledCourseIds.length} free course(s) unlocked.`);
      } else {
        toast.success('Enrolled in learning path!');
      }
      if (paidCourses.length > 0) {
        toast(`Complete payment for ${paidCourses.length} paid course(s) to continue.`, { icon: '🔒' });
      }
      const enrolledRes = await api.get('/learning-paths/my/enrollments');
      setEnrolledPaths(enrolledRes.data.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to enroll');
    }
  };

  const handleClaimXp = async () => {
    toast('Keep completing lessons to earn XP! 1000 XP = ₦100 at checkout.', { icon: '⚡' });
  };

  if (isLoading) return <PageSkeleton />;

  const enrolledMap = new Map(enrolledPaths.map((ep: any) => [ep.path_id, ep]));
  const myGoalMap = new Map(myGoals.map((g: any) => [g.slug, g]));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <GitBranch className="w-7 h-7 text-primary-500" /> Learning Paths
          </h1>
          <p className="text-gray-500 mt-1">Structured journeys by <span className="font-medium text-gray-700 dark:text-gray-300">Our Schools</span> — ascending Beginner → Intermediate → Advanced (empty zones hidden).</p>
        </div>
        {isAuthenticated && xpBalance && (
          <GlassCard className="p-3 flex items-center gap-3" hover={false}>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-sm font-bold">{xpBalance.available?.toLocaleString() || 0} XP</div>
              <div className="text-xs text-gray-500">≈ ₦{xpBalance.ngnValue?.toLocaleString() || 0} • 1000 XP = ₦100</div>
            </div>
            <Button size="sm" variant="outline" onClick={handleClaimXp}>Claim</Button>
          </GlassCard>
        )}
      </div>

      {enrolledPaths.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-500" /> My Learning Paths
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledPaths.map((path: any, i: number) => (
              <motion.div key={path.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/student/learning-paths/${path.slug}`} className="block group">
                  <GlassCard className="h-full p-0 overflow-hidden" hover>
                    <div className={`h-2 bg-gradient-to-r ${path.color || 'from-blue-600 to-cyan-600'}`} />
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                          <GitBranch className="w-5 h-5 text-primary-500" />
                        </div>
                        <Badge variant={path.progress >= 100 ? 'success' : 'primary'} size="sm">{path.progress}%</Badge>
                      </div>
                      <h3 className="font-semibold text-base mb-1 group-hover:text-primary-600 transition-colors">{path.title}</h3>
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{path.description}</p>
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-700" style={{ width: `${path.progress}%` }} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-success-500" /> {path.completedCourses || 0}/{path.totalCourses || 0}</span>
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {path.enrolledCourses || 0} enrolled</span>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {careerGoals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-500" /> Pick Your Career Goal
            </h2>
            <Badge variant="primary" size="sm">{myGoals.length} pursued</Badge>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {careerGoals.map((goal: any, i: number) => {
              const Icon = goalIcons[goal.icon] || Target;
              const my = myGoalMap.get(goal.slug);
              const isPursuing = !!my;
              const isDone = my?.completed;
              return (
                <motion.div key={goal.slug} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link to={`/student/career-goals/${goal.slug}`} className="block group">
                    <GlassCard className="h-full p-5" hover>
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-primary-500" />
                        </div>
                        {isPursuing && (
                          <Badge variant={isDone ? 'success' : 'primary'} size="sm">
                            {isDone ? 'Achieved' : `${my.progress}%`}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-base mb-1 group-hover:text-primary-600 transition-colors">
                        {goal.role_title}
                      </h3>
                      <div className="flex flex-wrap gap-1 mt-1 mb-3">
                        {(goal.desired_skills || []).slice(0, 3).map((s: string) => (
                          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-500/10 text-primary-500 border border-primary-500/20">{s}</span>
                        ))}
                      </div>
                      {isPursuing && (
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-700" style={{ width: `${my.progress}%` }} />
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {goal.courses_count}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.floor((goal.total_duration || 0) / 60)}h</span>
                        {goal.salary_band && (
                          <span className="flex items-center gap-1 text-amber-600"><Briefcase className="w-3 h-3" /> {goal.salary_band}</span>
                        )}
                      </div>
                      <Button size="sm" variant="outline" className="w-full">
                        {isPursuing ? 'Continue Goal' : 'Start This Goal'} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </GlassCard>
                  </Link>
                </motion.div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Each goal is a curated, phase-structured pathway (Foundations → Core → Build → Hire) that bundles the courses you need for that role.
          </p>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-4">Explore by School • Gamified Roadmap Zones</h2>
        {grouped.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <GitBranch className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No learning paths available yet.</p>
            <p className="text-xs mt-2">Schools exist (Our Schools) — publish courses with level & program to generate Beginner → Advanced zones.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((group: any) => {
              const school = group.school || { name: group.category, slug: group.categorySlug, description: '', program_count: group.totalCourses || 0, sort_order: 0 };
              const sc = schoolCareers[school.name] || { careers: ['Software Developer'], description: school.description || '' };
              return (
              <GlassCard key={school.slug || group.category} className="p-0 overflow-hidden" hover={false}>
                <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-[220px]">
                      <h3 className="text-lg font-bold flex items-center gap-2">{school.name} <Badge variant="default" size="sm">{school.program_count ?? group.totalCourses ?? 0} programs</Badge></h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{sc.description}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-2">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Self-paced</span>
                        <span className="text-gray-300">·</span>
                        <span>{group.totalCourses ?? Object.values(group.zones).filter(Boolean).length} courses</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {sc.careers.map((c: string) => <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-500 border border-primary-500/20">{c}</span>)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="primary" className="capitalize">{school.slug}</Badge>
                      <Link to={`/schools/${school.slug}`} className="text-xs text-primary-500 hover:underline">Explore Programs →</Link>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">3 zones ascending Beginner → Intermediate → Advanced • empty zones hidden</p>
                </div>

                <div className="p-4 sm:p-6 grid md:grid-cols-3 gap-4">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((level) => {
                    const zone = group.zones[level];
                    if (!zone) return null; // hide empty zone
                    const meta = zoneMeta[level];
                    const Icon = meta.icon;
                    const enrolled = enrolledMap.get(zone.path.id);
                    const progress = enrolled?.progress ?? 0;
                    const isEnrolled = !!enrolled;
                    const isCompleted = progress >= 100;
                    return (
                      <Link
                        key={level}
                        to={`/student/learning-paths/${zone.path.slug}`}
                        className={`group relative overflow-hidden rounded-2xl border-2 p-4 transition-all hover:scale-[1.01] hover:shadow-lg ${meta.border} ${isCompleted ? 'bg-gradient-to-br from-emerald-500/5 to-teal-500/5' : 'bg-white dark:bg-gray-900/50'}`}
                      >
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${meta.color}`} />
                        <div className="flex items-start justify-between mb-3 mt-2">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.bg}`}>
                            <Icon className={`w-5 h-5 ${level === 'beginner' ? 'text-emerald-600' : level === 'intermediate' ? 'text-blue-600' : 'text-purple-600'}`} />
                          </div>
                          <Badge className={`capitalize bg-gradient-to-r ${meta.color} text-white border-0`}>{meta.label}</Badge>
                        </div>
                        <h4 className="font-semibold text-sm mb-1 group-hover:text-primary-600 transition-colors line-clamp-1">{zone.path.title}</h4>
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{zone.path.description}</p>

                        <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-3">
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {zone.courses_count}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.floor((zone.total_duration || 0) / 60)}h</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {zone.students_count}</span>
                        </div>

                        {isEnrolled ? (
                          <div className="space-y-2">
                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full bg-gradient-to-r ${meta.color} transition-all`} style={{ width: `${progress}%` }} />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className={isCompleted ? 'text-emerald-600 font-medium' : 'text-gray-500'}>{isCompleted ? 'Completed ✓' : `${progress}% • ${enrolled.completedCourses}/${enrolled.totalCourses}`}</span>
                              <span className="text-primary-500 font-medium group-hover:underline">View →</span>
                            </div>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="w-full mt-1" onClick={(e) => handleEnroll(zone.path.slug, e)}>
                            <PlayCircle className="w-3.5 h-3.5 mr-1" /> Enroll • {zone.courses_count} courses
                          </Button>
                        )}

                        {/* Gamified connector dot */}
                        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 bg-gradient-to-r ${meta.color} hidden md:block`} />
                      </Link>
                    );
                  })}
                </div>

                {/* Roadmap line connector (desktop) */}
                <div className="hidden md:block h-1 mx-6 mb-2 rounded-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 opacity-20" />
              </GlassCard>
              );
            })}
          </div>
        )}
      </section>
    </motion.div>
  );
}
